/***
* サーバー公開
* 検討機能
* back/forwardの挙動が安定しないので確認
* 棋譜の上書き
* 石の繋がり表示
-----
* 見学機能
* パスワード
* 自動申込
* GnuGOからの返信を簡略化
* Dragon情報の表示
***/
package main

import (
	"fmt"
	"net/http"

	"github.com/gyosit/Goiro.git/secure"
	"github.com/gyosit/Goiro.git/crypto"
	"github.com/gyosit/Goiro.git/ex_gnugo"
	"github.com/gyosit/Goiro.git/sessionmanager"

	//"net"
	//"net/http/fcgi"
	"database/sql"
	"encoding/base64"
	"io"
	"io/ioutil"
	"log"
	"math/rand"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
	"gopkg.in/olahol/melody.v1"
)

type User struct {
	gorm.Model
	Username string `form:"username" binding:"required" gorm:"unique;not null"`
	Password string `form:"pass" binding:"required"`
}

type Play struct {
	gorm.Model
	Birth    string
	Name     string `form:"name"`
	Hash     string
	Password string `form:"pass"`
	Owner    string
	Black    string
	White    string
	Size     int     `form:"size" binding:"required"`
	Hande    int     `form:"hande"`
	Komi     float64 `form:"komi" gorm:"not null"`
	Time     int
	Winner   string
	Status   int // 0:Ready 1:Playing 2:Closed 3:Review
}

type SessionInfo struct {
	Username       interface{}
	IsSessionAlive bool
}

type playerKeys struct {
	hash string
	turn int // black:1, white:-1
}

type JsonRequest struct {
	Name string `json:"name"`
	Date string `json:"date"`
	Img  string `json:"img"`
}

var LoginInfo SessionInfo

func main() {
	dbInit()

	router := gin.Default()
	m := melody.New()
	//"l, _ := net.Listen("tcp", ":1780")
	//"fcgi.Serve(l, router)

	store := cookie.NewStore([]byte("secret"))
	router.Use(sessions.Sessions("mysession", store))

	// Variables
	enters := make(map[string]int)
	turn := make(map[string]int)
	player := make(map[playerKeys]string)
	pass := make(map[string]int)
	count := make(map[string]int)
	hash_table := make(map[string]string)
	goiro_level := make(map[string]int)

	// Session
	//store := cookie.NewStore([]byte("secret"))
	//router.Use(sessions.Sessions("mysession", store))

	router.LoadHTMLGlob("views/*.html")
	router.Static("/assets", "./assets")
	router.Static("/TemplateData", "./views/TemplateData")
	router.Static("/Build", "./views/Build")

	router.GET("/", func(ctx *gin.Context) {
		username := SessionManager.GetUser(ctx)
		ctx.HTML(http.StatusOK, "index.html", gin.H{"username": username})
	})

	router.GET("/play/:user/:room", func(ctx *gin.Context) {
		user := SessionManager.GetUser(ctx)
		var mode string
		hash := ctx.Param("room")
		room := getRoom(hash)
		fmt.Println(room)
		size := strconv.Itoa(room.Size)
		switch room.Black == "COM" || room.White == "COM" {
		case true:
			mode = "ai"
		case false:
			mode = "normal"
		}
		if room.Black == room.White {
			mode = "free"
		}
		if user == "" {
			user = "GUEST"
		}
		if user != ctx.Param("user") {
			ctx.Redirect(302, "/play/"+user+"/"+hash)
		}
		if mode == "ai" {
			if player[playerKeys{hash, turn[hash]}] == "COM" {
				best := ex_gnugo.FirstPlay(hash, turn[hash], room.Size, 5, goiro_level[hash])
				turn[hash] *= -1
				if best == "tt" {
					pass[hash]++
				}
			}
		}
		ctx.HTML(http.StatusOK, "play.html", gin.H{"mode": mode, "user": user, "size": size})
	})

	router.GET("/playreview/:room", func(ctx *gin.Context) {
		user := SessionManager.GetUser(ctx)
		mode := "free"
		hash := ctx.Param("room")
		original := getRoom(hash)
		var old_room Play
		old_room.Name = original.Name
		old_room.Password = original.Password
		old_room.Owner = "FREE"
		old_room.Size = original.Size
		old_room.Hande = original.Hande
		old_room.Komi = original.Komi
		size := strconv.Itoa(original.Size)
		if new_hash, err := createRoom(old_room); err != nil {
			ctx.HTML(http.StatusBadRequest, "index.html", gin.H{"err": err})
			fmt.Println(err)
			ctx.Abort()
		} else {
			if user == "" {
				user = "GUEST"
			}
			new_room := getRoom(new_hash)
			new_room.Owner = "FREE"
			updateRoom(new_hash, new_room)
			head := "./assets/kifu/"
			tail := ".sgf"
			src, err := os.Open(head + original.Hash + tail)
			if err != nil {
				panic(err)
			}
			defer src.Close()

			dst, err := os.Create(head + new_room.Hash + tail)
			if err != nil {
				panic(err)
			}
			defer dst.Close()

			_, err = io.Copy(dst, src)
			if err != nil {
				panic(err)
			}
			if user != ctx.Param("user") {
				ctx.Redirect(302, "/play/"+user+"/"+new_hash)
			}

			player[playerKeys{new_hash, 1}] = user
			player[playerKeys{new_hash, -1}] = user
			switch {
			case new_room.Hande < 2:
				turn[new_hash] = 1
			default:
				turn[new_hash] = -1
			}
			pass[new_hash] = 0
			copyFile(new_hash, "tmp")

			ctx.HTML(http.StatusOK, "play.html", gin.H{"mode": mode, "user": user, "size": size})
		}
	})

	router.GET("/connect/:user/ws", func(ctx *gin.Context) {
		user := ctx.Param("user")
		fmt.Println(user)
		m.HandleRequest(ctx.Writer, ctx.Request)
	})

	router.GET("/goto", func(ctx *gin.Context) {
		hash := ctx.Query("room")
		user := SessionManager.GetUser(ctx)
		challanger := SessionManager.GetUser(ctx)
		room := getRoom(hash)
		switch {
		case room.Black != "":
			room = applyPlay(hash, challanger, "black")
		case room.White != "":
			room = applyPlay(hash, challanger, "white")
		default:
			room = applyPlay(hash, challanger, "ignore")
		}
		player[playerKeys{hash, 1}] = room.Black
		player[playerKeys{hash, -1}] = room.White
		turn[hash] = 1
		pass[hash] = 0
		ctx.Redirect(302, "/play/"+user+"/"+hash)
	})

	router.GET("/regist", func(ctx *gin.Context) {
		ctx.HTML(200, "regist.html", gin.H{})
	})

	router.GET("/login", func(ctx *gin.Context) {
		ctx.HTML(200, "login.html", gin.H{})
	})

	router.GET("/logout", func(ctx *gin.Context) {
		SessionManager.Logout(ctx)
		ctx.Redirect(302, "/")
	})

	router.GET("/rooms", func(ctx *gin.Context) {
		rooms := getRooms()
		fmt.Println(rooms)
		ctx.HTML(200, "rooms.html", gin.H{"rooms": rooms})
	})

	router.GET("/thanks", func(ctx *gin.Context) {
		ctx.HTML(200, "thanks.html", gin.H{})
	})

	router.GET("/history", func(ctx *gin.Context) {
		ctx.HTML(200, "history.html", gin.H{})
	})

	router.GET("/message", func(ctx *gin.Context) {
		ctx.HTML(200, "message.html", gin.H{})
	})

	router.GET("/unity", func(ctx *gin.Context) {
		ctx.HTML(200, "unity.html", gin.H{})
	})

	router.GET("/thumbnail/:name", func(ctx *gin.Context) {
		name := ctx.Param("name")
		ctx.File("./assets/thumbnail/" + name)
	})

	router.GET("/html/:hash", func(ctx *gin.Context) {
		hash := ctx.Param("hash")
		ctx.File("./assets/html/" + hash + ".html")
	})

	router.POST("/regist", func(ctx *gin.Context) {
		var form User
		username := ctx.PostForm("username")
		pass := ctx.PostForm("pass")
		if strings.Index(username, "GUEST") != -1 {
			// ゲストアカウント
			ctx.HTML(http.StatusBadRequest, "regist.html", gin.H{"err": "既にそのユーザーが存在します。"})
		}
		if err := ctx.Bind(&form); err == nil {
			if err := createUser(username, pass); err != nil {
				fmt.Printf("Already user\n")
				ctx.HTML(http.StatusBadRequest, "regist.html", gin.H{"err": "既にそのユーザーが存在します。"})
				fmt.Println(err)
			} else {
				ctx.Redirect(302, "/login")
			}
		} else {
			fmt.Println(err)
		}
	})

	router.POST("/login", func(ctx *gin.Context) {
		var form User
		username := ctx.PostForm("username")
		pass := ctx.PostForm("pass")
		fmt.Println(pass)
		if err := ctx.Bind(&form); err == nil {
			ex_pass := getUser(username).Password
			if err := crypto.CompareHashAndPassword(ex_pass, pass); err != nil {
				fmt.Printf("No User\n")
				fmt.Println(err)
				ctx.HTML(http.StatusBadRequest, "login.html", gin.H{"err": "ユーザー名かパスワードが違います。"})
			} else {
				fmt.Printf("Go login\n")
				SessionManager.Login(ctx, username)
				ctx.Redirect(302, "/")
			}
		}
	})

	router.POST("/create_room", func(ctx *gin.Context) {
		var form Play
		if err := ctx.Bind(&form); err != nil {
			fmt.Printf("BindError!!!!!\n")
			fmt.Println(err)
			ctx.HTML(http.StatusBadRequest, "index.html", gin.H{"err": err})
			ctx.Abort()
		}
		username := SessionManager.GetUser(ctx)
		form.Owner = username
		if hash_room, err := createRoom(form); err != nil {
			ctx.HTML(http.StatusBadRequest, "index.html", gin.H{"err": err})
			fmt.Println(err)
			ctx.Abort()
		} else {
			//ex_gnugo.CreateKifu(form.Size, form.Hande, form.Komi, hash_room)
			fmt.Printf("Redirect!\n")
			room := getRoom(hash_room)
			switch ctx.PostForm("turn") {
			case "black":
				room.Black = username
			case "white":
				room.White = username
			}
			updateRoom(hash_room, room)
			fmt.Printf(hash_room)
			ex_gnugo.InitKifu(form.Size, form.Hande, form.Komi, "*black*", "*white*", "*data*", hash_room)
			ctx.Redirect(302, "/play/"+username+"/"+hash_room)
		}
	})

	router.POST("/ai_room", func(ctx *gin.Context) {
		var form Play
		how_turn := ctx.PostForm("turn")
		if err := ctx.Bind(&form); err != nil {
			fmt.Printf("BindError!!!!!\n")
			fmt.Println(err)
			ctx.HTML(http.StatusBadRequest, "index.html", gin.H{"err": err})
			ctx.Abort()
		}
		username := SessionManager.GetUser(ctx)
		form.Owner = username
		if hash_room, err := createRoom(form); err != nil {
			ctx.HTML(http.StatusBadRequest, "index.html", gin.H{"err": err})
			fmt.Println(err)
			ctx.Abort()
		} else {
			ex_gnugo.InitKifu(form.Size, form.Hande, form.Komi, "*black*", "*white*", "*data*", hash_room)
			room := applyPlay(hash_room, "COM", how_turn)
			player[playerKeys{hash_room, 1}] = room.Black
			player[playerKeys{hash_room, -1}] = room.White
			switch {
			case room.Hande < 2:
				turn[hash_room] = 1
			default:
				turn[hash_room] = -1
			}
			pass[hash_room] = 0
			fmt.Printf("Redirect!\n")
			fmt.Printf(hash_room)
			ctx.Redirect(302, "play/"+username+"/"+hash_room)
		}
	})

	router.POST("/free_room", func(ctx *gin.Context) {
		var form Play
		if err := ctx.Bind(&form); err != nil {
			fmt.Printf("BindError!!!!!\n")
			fmt.Println(err)
			ctx.HTML(http.StatusBadRequest, "index.html", gin.H{"err": err})
			ctx.Abort()
		}
		username := SessionManager.GetUser(ctx)
		form.Owner = username
		if hash_room, err := createRoom(form); err != nil {
			ctx.HTML(http.StatusBadRequest, "index.html", gin.H{"err": err})
			fmt.Println(err)
			ctx.Abort()
		} else {
			ex_gnugo.InitKifu(form.Size, form.Hande, form.Komi, "*black*", "*white*", "*data*", hash_room)
			room := applyPlay(hash_room, username, "nigiri")
			player[playerKeys{hash_room, 1}] = room.Black
			player[playerKeys{hash_room, -1}] = room.White
			switch {
			case room.Hande < 2:
				turn[hash_room] = 1
			default:
				turn[hash_room] = -1
			}
			pass[hash_room] = 0
			fmt.Printf("Redirect!\n")
			fmt.Printf(hash_room)
			ctx.Redirect(302, "play/"+username+"/"+hash_room)
		}
	})

	router.POST("/save_image", func(ctx *gin.Context) {
		var json JsonRequest
		if err := ctx.ShouldBindJSON(&json); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		hash := hash_table[json.Name]
		name := hash + json.Date
		name = strings.Replace(name, "/", "_", -1)
		name = strings.Replace(name, ":", "_", -1)
		name = strings.Replace(name, " ", "", -1)
		decode(json.Img, name)
		ctx.JSON(http.StatusOK, gin.H{"url": name})
	})

	m.HandleConnect(func(s *melody.Session) {
		fmt.Println(s.Request.URL.Path)
	})

	m.HandleDisconnect(func(s *melody.Session) {
		fmt.Printf("DISCONNECT\n")
		user := strings.Split(s.Request.URL.Path, "/")[2]
		hash := hash_table[user]
		hash_table[user] = ""
		fmt.Println(hash)
		if hash != "" {
			enters[hash] -= 1
			room := getRoom(hash)
			fmt.Println(room)
			if room.Status < 2 && enters[hash] < 1 {
				deleteRoom(room.Hash) //検討画面の戻る→進む応急バグ対応　今後画面遷移をしない形で修正
			}
		}
	})

	m.HandleMessage(func(s *melody.Session, msg []byte) {
		head := "./assets/kifu/"
		tail := ".sgf"
		user := strings.Split(s.Request.URL.Path, "/")[2]
		hash := hash_table[user]
		original_hash := hash
		room := getRoom(hash)
		fmt.Println(string(msg) + "\n")
		parse := strings.Split(string(msg), " ")
		senrigan := false
		fmt.Println(turn[hash])
		fmt.Println(senrigan)
		_, err := os.Stat(head + hash + "_" + user + tail)
		if err == nil {
			fmt.Printf("Senrigan now::\n")
			senrigan = true
			hash = hash + "_" + user
			pass[hash] = 0
			switch parse[0] {
			case "coordinate_ai":
				parse[0] = "coordinate"
			case "pass_ai":
				parse[0] = "pass"
			case "resign":
				parse[0] = ""
			}
		}
		_, err = os.Stat(head + hash + "_" + tail)
		if err == nil {
			pass[hash] = 0
			switch parse[0] {
			case "resign":
				parse[0] = ""
			}
		}
		fmt.Println(hash)
		fmt.Printf("The order is %s\n", parse[0])
		switch parse[0] {
		case "coordinate":
			if user != player[playerKeys{hash, turn[hash]}] {
				break
			}
			if _, err := os.Stat(head + hash + "tmp" + tail); err == nil {
				if _, err := os.Stat(head + hash + "_" + tail); err != nil {
					copyFile(hash, "_")
				}
			}
			i, _ := strconv.Atoi(parse[1])
			res, _, _, _ := ex_gnugo.PlayStone(hash, turn[hash], i, room.Size, 0)
			if res != "Illegal" {
				turn[hash] *= -1
				pass[hash] = 0

			}
			board := ex_gnugo.ShowBoard(hash)
			sendClient(m, s, "board:"+board, true, hash_table)
			sendClient(m, s, "player:"+room.Black+","+room.White, true, hash_table)
			sendInfluence(m, s, hash, turn[hash], room.Size, hash_table)
			if _, err := os.Stat(head + hash + "tmp" + tail); err == nil {
				copyFile(hash, "tmptmp")
			}
		case "coordinate_ai":
			if user != player[playerKeys{hash, turn[hash]}] {
				break
			}
			i, _ := strconv.Atoi(parse[1])
			level, _ := strconv.Atoi(parse[2])
			res, _, _, _ := ex_gnugo.PlayStone(hash, turn[hash], i, room.Size, level)
			board := ex_gnugo.ShowBoard(hash)
			if res != "Illegal" {
				pass[hash] = 0
				c_b, c_w := ex_gnugo.CapturedStone(hash)
				sendClient(m, s, "board:"+board, true, hash_table)
				sendClient(m, s, "captured:"+c_b+","+c_w, true, hash_table)
				last := ex_gnugo.CheckTurn(hash, room.Size)
				sendClient(m, s, "turn:"+last, true, hash_table)
				sendClient(m, s, "player:"+room.Black+","+room.White, true, hash_table)
				score, board, best, alive_dead := ex_gnugo.Genmove(hash, turn[hash], i, room.Size, level, goiro_level[hash])
				c_b, c_w = ex_gnugo.CapturedStone(hash)
				sendClient(m, s, "board:"+board, true, hash_table)
				sendClient(m, s, "captured:"+c_b+","+c_w, true, hash_table)
				sendClient(m, s, "score:"+score, true, hash_table)
				sendClient(m, s, "alive_dead:"+alive_dead, true, hash_table)
				last = ex_gnugo.CheckTurn(hash, room.Size)
				sendClient(m, s, "turn:"+last, true, hash_table)
				sendClient(m, s, "player:"+room.Black+","+room.White, true, hash_table)
				sendInfluence(m, s, hash, turn[hash], room.Size, hash_table)
				if best == "tt" {
					pass[hash]++
					sendClient(m, s, "pass", true, hash_table)
					if pass[hash] > 1 {
						sendClient(m, s, "busy", true, hash_table)
						score = ex_gnugo.FinalScore(hash)
						endGame(hash, score)
						ex_gnugo.WriteScore(hash, score)
						turn[hash] = 2
						sendClient(m, s, "finalscore:"+score, true, hash_table)
					}
				} else {
					pass[hash] = 0
				}
			}
		case "dragon":
			i, _ := strconv.Atoi(parse[1])
			res := ex_gnugo.HuntDragon(hash, turn[hash], i, room.Size)
			fmt.Printf(res)
			sendClient(m, s, "bless:"+res, false, hash_table)
		case "pass":
			fmt.Printf("PAAAAAS!")
			if user != player[playerKeys{hash, turn[hash]}] {
				break
			}
			if _, err := os.Stat(head + hash + "tmp" + tail); err == nil {
				if _, err := os.Stat(head + hash + "_" + tail); err != nil {
					copyFile(hash, "_")
				}
			}
			sendClient(m, s, "pass", true, hash_table)
			pass[hash]++
			ex_gnugo.Pass_nonai(hash, turn[hash])
			turn[hash] *= -1
			var score string
			if pass[hash] > 1 && player[playerKeys{hash, -1}] != player[playerKeys{hash, 1}] {
				sendClient(m, s, "busy", true, hash_table)
				score = ex_gnugo.FinalScore(hash)
				endGame(hash, score)
				ex_gnugo.WriteScore(hash, score)
				turn[hash] = 2
				sendClient(m, s, "finalscore:"+score, true, hash_table)
			} else {
				score = ex_gnugo.EstimateScore(hash)
				sendClient(m, s, "score:"+score, true, hash_table)
			}
			if _, err := os.Stat(head + hash + "tmp" + tail); err == nil {
				copyFile(hash, "tmptmp")
			}
		case "pass_ai":
			if user != player[playerKeys{hash, turn[hash]}] {
				break
			}
			pass[hash]++
			level, _ := strconv.Atoi(parse[1])
			if pass[hash] < 2 {
				score, board, best, alive_dead := ex_gnugo.Pass(hash, turn[hash], room.Size, level, goiro_level[hash])
				if best == "tt" {
					// End this game by AI
					sendClient(m, s, "busy", true, hash_table)
					score = ex_gnugo.FinalScore(hash)
					endGame(hash, score)
					ex_gnugo.WriteScore(hash, score)
					turn[hash] = 2
					sendClient(m, s, "finalscore:"+score, true, hash_table)
				} else {
					// Continue this game
					pass[hash] = 0
					sendClient(m, s, "board:"+board, true, hash_table)
					sendClient(m, s, "score:"+score, true, hash_table)
					sendClient(m, s, "player:"+room.Black+","+room.White, true, hash_table)
					sendClient(m, s, "alive_dead:"+alive_dead, true, hash_table)
				}
			} else {
				// End this game by the user
				ex_gnugo.Pass(hash, turn[hash], 9, 0, goiro_level[hash])
				sendClient(m, s, "busy", true, hash_table)
				score := ex_gnugo.FinalScore(hash)
				endGame(hash, score)
				ex_gnugo.WriteScore(hash, score)
				turn[hash] = 2
				sendClient(m, s, "finalscore:"+score, true, hash_table)
			}
		case "resign":
			if user != player[playerKeys{hash, turn[hash]}] {
				fmt.Println(player[playerKeys{hash, turn[hash]}])
				break
			}
			resign := ex_gnugo.Resign(hash, turn[hash])
			endGame(hash, resign)
			resign = resign
			if resign == "B+R" {
				turn[hash] = 3
			} else {
				turn[hash] = -3
			}
			pass[hash] = 0
			sendClient(m, s, "player:"+room.Black+","+room.White, true, hash_table)
			sendClient(m, s, "finalscore:"+resign, true, hash_table)
		case "senrigan":
			if !senrigan {
				copySenrigan(hash, user, true)
				turn[hash+"_"+user] = turn[hash]
				player[playerKeys{hash + "_" + user, 1}] = user
				player[playerKeys{hash + "_" + user, -1}] = user
			} else {
				copySenrigan(hash, user, false)
				hash = original_hash
				sendInfluence(m, s, hash, turn[hash], room.Size, hash_table)
			}
		case "show":
			room := getRoom(hash)
			sendClient(m, s, "player:"+room.Black+","+room.White, true, hash_table)
			var score string
			if room.Status == 2 {
				score = room.Winner
				board, alive_dead, weakness, moyo := ex_gnugo.ShowInfluence(hash, 1, room.Size)
				sendClient(m, s, "board:"+board, true, hash_table)
				sendClient(m, s, "alive_dead:"+alive_dead, true, hash_table)
				sendClient(m, s, "weakness:"+weakness, true, hash_table)
				sendClient(m, s, "moyo:"+moyo, true, hash_table)
				sendClient(m, s, "finalscore:"+score, true, hash_table)
			} else {
				if turn[hash] == 0 {
					turn[hash] = 1
				}
				sendInfluence(m, s, hash, turn[hash], room.Size, hash_table)
			}
		case "back":
			copyFile(hash, "tmp")
			turn[hash] = editKifu(hash, -1)
			board := ex_gnugo.ShowBoard(hash)
			sendClient(m, s, "board:"+board, true, hash_table)
			go func() {
				count[hash]++
				time.Sleep(time.Second * 1)
				if count[hash] < 2 {
					sendInfluence(m, s, hash, turn[hash], room.Size, hash_table)
					last := ex_gnugo.CheckTurn(hash, room.Size)
					sendClient(m, s, "turn:"+last, true, hash_table)
				}
				count[hash]--
			}()
		case "forward":
			if _, err := os.Stat(head + hash + "tmp" + tail); err == nil {
				turn[hash] = editKifu(hash, 1)
				board := ex_gnugo.ShowBoard(hash)
				sendClient(m, s, "board:"+board, true, hash_table)
				go func() {
					count[hash]++
					time.Sleep(time.Second * 1)
					if count[hash] < 2 {
						sendInfluence(m, s, hash, turn[hash], room.Size, hash_table)
						last := ex_gnugo.CheckTurn(hash, room.Size)
						sendClient(m, s, "turn:"+last, true, hash_table)
					}
					count[hash]--
				}()
			}
		case "resume":
			turn[hash] = resumeKifu(hash)
			sendInfluence(m, s, hash, turn[hash], room.Size, hash_table)
		case "override":
			turn[hash] = overrideKifu(hash)
			copyFile(hash, "tmp")
		case "head":
			copyFile(hash, "tmp")
			turn[hash] = editKifu(hash, -100)
			sendInfluence(m, s, hash, turn[hash], room.Size, hash_table)
		case "end":
			showEnd(hash)
			sendInfluence(m, s, hash, turn[hash], room.Size, hash_table)
		case "create_room":
			var room Play
			var challenger string
			room.Size, _ = strconv.Atoi(parse[2])
			room.Komi, _ = strconv.ParseFloat(parse[3], 64)
			how_turn := parse[4]
			mode := parse[6]
			level := parse[7]
			switch how_turn {
			case "黒番":
				how_turn = "black"
			case "白番":
				how_turn = "white"
			default:
				how_turn = "nigiri"
			}
			room.Hande, _ = strconv.Atoi(parse[5])
			room.Owner = user
			if hash, err := createRoom(room); err != nil {

			} else {
				enters[hash]++
				ex_gnugo.InitKifu(room.Size, room.Hande, room.Komi, "*black*", "*white*", "*data*", hash)
				switch mode {
				case "ai":
					challenger = "COM"
				case "free":
					challenger = user
				}
				switch level {
				case "普通":
					goiro_level[hash] = -1
				case "強い":
					goiro_level[hash] = 1
				}
				room = applyPlay(hash, challenger, how_turn)
				player[playerKeys{hash, 1}] = room.Black
				player[playerKeys{hash, -1}] = room.White
				switch {
				case room.Hande < 2:
					turn[hash] = 1
				default:
					turn[hash] = -1
				}
				pass[hash] = 0
				hash_table[user] = hash
				if mode == "ai" {
					if player[playerKeys{hash, turn[hash]}] == "COM" {
						best := ex_gnugo.FirstPlay(hash, turn[hash], room.Size, 5, goiro_level[hash])
						fmt.Println(best)
						turn[hash] *= -1
						if best == "tt" {
							pass[hash]++
						}
					}
				}
			}
		case "leave":
			hash_table[user] = ""
			enters[hash]--
			fmt.Printf("In this room:%d\n", enters[hash])
			if enters[hash] <= 0 {
				deleteRoom(hash)
			}
		case "review":
			index, _ := strconv.Atoi(parse[1])
			rooms, real_index := getMyRooms(user, index)
			var rooms_info string
			for _, v := range rooms {
				room_info := fmt.Sprintf("%s,%s,%d,%.1f,%d,%s,%s,%s,%s",
					v.Name, v.Birth, v.Size, v.Komi, v.Hande, v.Black, v.White, v.Winner, v.Hash)
				rooms_info += room_info + "<cut>"
			}
			sendClient(m, s, "review:"+rooms_info, false, hash_table)
			sendClient(m, s, "review_ind:"+strconv.Itoa(real_index), false, hash_table)
		case "openreview":
			hash = parse[1]
			original := getRoom(hash)
			var old_room Play
			old_room.Name = original.Name
			old_room.Password = original.Password
			old_room.Owner = "FREE"
			old_room.Size = original.Size
			old_room.Hande = original.Hande
			old_room.Komi = original.Komi
			old_room.Black = original.Black
			old_room.White = original.White
			if new_hash, err := createRoom(old_room); err != nil {
				fmt.Println(err)
			} else {
				new_room := getRoom(new_hash)
				new_room.Owner = "FREE"
				updateRoom(new_hash, new_room)
				head := "./assets/kifu/"
				tail := ".sgf"
				src, err := os.Open(head + original.Hash + tail)
				if err != nil {
					panic(err)
				}
				defer src.Close()

				dst, err := os.Create(head + new_room.Hash + tail)
				if err != nil {
					panic(err)
				}
				defer dst.Close()

				_, err = io.Copy(dst, src)
				if err != nil {
					panic(err)
				}

				player[playerKeys{new_hash, 1}] = user
				player[playerKeys{new_hash, -1}] = user
				switch {
				case new_room.Hande < 2:
					turn[new_hash] = 1
				default:
					turn[new_hash] = -1
				}
				pass[new_hash] = 0
				copyFile(new_hash, "tmp")
				hash_table[user] = new_hash
			}
		}
		/*last := ex_gnugo.CheckTurn(hash, room.Size)
		sendClient(m, s, "turn:"+last, true, hash_table)*/
	})

	router.Run(":1780")
	// router.RunTLS(":1780",
	// 	"/etc/letsencrypt/live/goiro.net/fullchain.pem",
	// 	"/etc/letsencrypt/live/goiro.net/privkey.pem")
}

func sendInfluence(m *melody.Melody, s *melody.Session, hash string, turn int, room_size int, hash_table map[string]string) {
	board, alive_dead, weakness, moyo := ex_gnugo.ShowInfluence(hash, turn, room_size)
	sendClient(m, s, "alive_dead:"+alive_dead, true, hash_table)
	sendClient(m, s, "board:"+board, true, hash_table)
	sendClient(m, s, "weakness:"+weakness, true, hash_table)
	sendClient(m, s, "moyo:"+moyo, true, hash_table)
	score := ex_gnugo.EstimateScore(hash)
	sendClient(m, s, "score:"+score, true, hash_table)
}

func execDB(db *sql.DB, q string) {
	if _, err := db.Exec(q); err != nil {
		log.Fatal(err)
	}
}

func dbInit() {
	db := gormConnect()
	defer db.Close()
	db.AutoMigrate(&User{})
	db.AutoMigrate(&Play{})
}

func createUser(username string, pass string) []error {
	passwordEncrypt, _ := crypto.PasswordEncrypt(pass)
	db := gormConnect()
	defer db.Close()
	if err := db.Create(&User{Username: username, Password: passwordEncrypt}).GetErrors(); len(err) != 0 {
		fmt.Println(err)
		return err
	}
	return nil
}

func createRoom(play Play) (string, []error) {
	db := gormConnect()
	defer db.Close()
	t := time.Now()
	layout := "Jan 2, 2006 at 3:04pm (MST)"
	layout2 := "2006/01/02 15:04"
	str_t := t.Format(layout) + play.Owner
	hash_t, _ := crypto.PasswordEncrypt(str_t)
	hash_t = strings.Replace(hash_t, "/", "S", -1)
	hash_t = strings.Replace(hash_t, ".", "_", -1)
	hash_t = strings.Replace(hash_t, "$", "D", -1)
	play.Hash = hash_t
	play.Birth = t.Format(layout2)

	if err := db.Create(&play).GetErrors(); len(err) != 0 {
		fmt.Println(err)
		return "", err
	}
	fmt.Println(play)
	return hash_t, nil
}

func getUser(username string) User {
	db := gormConnect()
	var user User
	db.First(&user, "username = ?", username)
	db.Close()
	return user
}

func getRoom(hash string) Play {
	db := gormConnect()
	var room Play
	db.First(&room, "hash = ?", hash)
	db.Close()
	return room
}

func updateRoom(hash string, newroom Play) {
	db := gormConnect()
	var room Play
	db.First(&room, "hash = ?", hash)
	room = newroom
	db.Save(&room)
	db.Close()
}

func deleteRoom(hash string) {
	db := gormConnect()
	var room Play
	db.First(&room, "hash = ?", hash)
	if room.ID == 0 {
		return
	}
	db.Unscoped().Delete(&room)
	db.Close()
	fmt.Printf("deleted\n")
}

func endGame(hash, score string) {
	db := gormConnect()
	var room Play
	db.First(&room, "hash = ?", hash)
	room.Status = 2
	room.Winner = score
	db.Save(&room)
	db.Close()
}

func getRooms() []Play {
	db := gormConnect()
	var rooms []Play
	db.Where("status = ? OR status = ?", "0", "1").Find(&rooms)
	db.Close()
	return rooms
}

func getMyRooms(user string, index int) ([]Play, int) {
	db := gormConnect()
	var rooms []Play
	db.Order("id").Where("black = ? OR white = ?", user, user).Find(&rooms)
	db.Close()
	for i, j := 0, len(rooms)-1; i < j; i, j = i+1, j-1 {
		rooms[i], rooms[j] = rooms[j], rooms[i]
	}
	if len(rooms) < 5 {
		return rooms, 0
	}
	if index+4 > len(rooms) {
		index = len(rooms) - 4
	}
	return rooms[index : index+4], index
}

func applyPlay(hash, challanger, how_turn string) Play {
	db := gormConnect()
	var room Play
	db.First(&room, "hash = ?", hash)
	owner := room.Owner
	rand.Seed(time.Now().UnixNano())
	switch how_turn {
	case "ignore":
		if room.Black == "" && room.White == "" {
			how_turn = "nigiri"
		} else if room.Black == "" && room.White != "" {
			how_turn = "white"
		} else {
			how_turn = "black"
		}
		fallthrough
	case "nigiri":
		rnd := rand.Intn(2)
		switch rnd {
		case 0:
			room.Black = challanger
			room.White = owner
		case 1:
			room.Black = owner
			room.White = challanger
		}
	case "black":
		room.Black = owner
		room.White = challanger
	case "white":
		room.Black = challanger
		room.White = owner

	}
	room.Status = 1
	ex_gnugo.ChangeKifu(hash, "black", room.Black)
	ex_gnugo.ChangeKifu(hash, "white", room.White)
	ex_gnugo.ChangeKifu(hash, "data", time.Now().Format("2006-1-2"))
	db.Save(&room)
	db.Close()
	return room
}

func gormConnect() *gorm.DB {
	DBMS, USER, PASS, DBNAME := secure.Init()

	CONNECT := USER + ":" + PASS + "@" + "/" + DBNAME
	db, err := gorm.Open(DBMS, CONNECT)

	if err != nil {
		panic(err.Error())
	}
	return db
}

func sendClient(m *melody.Melody, s *melody.Session, msg string, everyone bool, hash_table map[string]string) {
	if everyone {
		m.BroadcastFilter([]byte(msg), func(q *melody.Session) bool {
			parse_q := strings.Split(string(q.Request.URL.Path), "/")[2]
			parse_s := strings.Split(string(s.Request.URL.Path), "/")[2]
			fmt.Printf("send client\n")
			fmt.Println(parse_q)
			return hash_table[parse_q] == hash_table[parse_s]
		})
	} else {
		m.BroadcastFilter([]byte(msg), func(q *melody.Session) bool {
			return q.Request.URL.Path == s.Request.URL.Path
		})
	}
}

func copyFile(hash, add string) {
	head := "./assets/kifu/"
	tail := ".sgf"
	_, err := os.Stat(head + hash + add + tail)
	if err != nil || add != "tmp" {
		// tmpファイルが存在しないときにコピーを作成する
		fmt.Printf("Copy Files\n")
		src, err := os.Open(head + hash + tail)
		if err != nil {
			panic(err)
		}
		defer src.Close()

		dst, err := os.Create(head + hash + add + tail)
		if err != nil {
			panic(err)
		}
		defer dst.Close()

		_, err = io.Copy(dst, src)
		if err != nil {
			panic(err)
		}
	}
}

func copySenrigan(hash, user string, copy bool) {
	head := "./assets/kifu/"
	add := "_" + user
	tail := ".sgf"
	switch copy {
	case true:
		src, err := os.Open(head + hash + tail)
		if err != nil {
			panic(err)
		}
		defer src.Close()

		dst, err := os.Create(head + hash + add + tail)
		if err != nil {
			panic(err)
		}
		defer dst.Close()

		_, err = io.Copy(dst, src)
		if err != nil {
			panic(err)
		}
	case false:
		if err := os.Remove(head + hash + tail); err != nil {
			fmt.Println(err)
		}
	}
}

func deleteFile(hash string) {
	head := "./assets/kifu/"
	tail := ".sgf"
	if err := os.Remove(head + hash + "tmptmp" + tail); err != nil {
		fmt.Println(err)
	}
	if err := os.Remove(head + hash + "_" + tail); err != nil {
		fmt.Println(err)
	}
}

func showEnd(hash string) {
	head := "./assets/kifu/"
	tail := ".sgf"
	var add string
	_, err := os.Stat(head + hash + "tmptmp" + tail)
	if err == nil {
		add = "tmptmp"
	} else {
		add = "tmp"
	}
	if err := os.Rename(head+hash+add+tail, head+hash+tail); err != nil {
		fmt.Println(err)
	}
	src, err := os.Open(head + hash + tail)
	if err != nil {
		panic(err)
	}
	defer src.Close()

	dst, err := os.Create(head + hash + add + tail)
	if err != nil {
		panic(err)
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	if err != nil {
		panic(err)
	}
}

func editKifu(hash string, step int) int {
	head := "./assets/kifu/"
	tail := ".sgf"
	tmp := "tmp"
	var turn int
	if _, err := os.Stat(head + hash + "tmp" + tail); err == nil {
		// tmpファイルがあるときにそれを元に棋譜ファイルを作成する
		if _, err := os.Stat(head + hash + "tmptmp" + tail); err == nil {
			// tmptmpファイルがあるときはこちらを元にする
			tmp = "tmptmp"
		}
		dst, err := os.OpenFile(head+hash+tail, os.O_RDWR, 0664) // 現在の譜面
		if err != nil {
			panic(err)
		}
		b, err := ioutil.ReadAll(dst)
		if err != nil {
			fmt.Printf("Error")
		}
		defer dst.Close()
		slice := strings.Split(string(b), ";")
		new_step := len(slice) + step - 1

		src, err := os.Open(head + hash + tmp + tail) // 元ファイル
		if err != nil {
			panic(err)
		}
		defer dst.Close()
		c, err := ioutil.ReadAll(src)
		if err != nil {
			fmt.Printf("Error")
		}

		slice_ := strings.Split(string(c), ";")
		if new_step < 2 {
			new_step = 2
		}
		if new_step > len(slice_)-1 {
			new_step = len(slice_) - 1
		}
		fmt.Println(slice_)
		fmt.Println(new_step)
		fmt.Printf("\n")
		switch string(slice_[new_step][0]) {
		case "B":
			turn = -1
		case "W":
			turn = 1
		}
		new_sentence := strings.Join(slice_[:new_step+1], ";") + ")"
		new_sentence = strings.Replace(new_sentence, "))", ")", -1)

		dst, err = os.Create(head + hash + tail)
		if err == nil {
			_, err = dst.WriteString(new_sentence)
			if err != nil {
				fmt.Println(err)
			}
		}
		defer dst.Close()
	}
	return turn
}

func resumeKifu(hash string) int {
	head := "./assets/kifu/"
	tail := ".sgf"
	var turn int
	if _, err := os.Stat(head + hash + "tmptmp" + tail); err == nil {
		// tmptmpファイルがあるときにそれを削除する
		os.Remove(head + hash + "tmptmp" + tail)
		os.Remove(head + hash + tail)
		os.Rename(head+hash+"_"+tail, head+hash+tail)
	}

	src, err := os.Open(head + hash + tail) // 元ファイル
	if err != nil {
		panic(err)
	}
	defer src.Close()
	c, err := ioutil.ReadAll(src)
	if err != nil {
		fmt.Printf("Error")
	}

	slice_ := strings.Split(string(c), ";")
	l := len(slice_)
	switch string(slice_[l-1][0]) {
	case "B":
		turn = -1
	case "W":
		turn = 1
	}
	fmt.Printf("turn is :\n")
	fmt.Println(turn)
	fmt.Printf("\n")
	return turn
}

func overrideKifu(hash string) int {
	head := "./assets/kifu/"
	tail := ".sgf"
	var turn int
	if _, err := os.Stat(head + hash + "tmp" + tail); err == nil {
		os.Remove(head + hash + "tmp" + tail)
		os.Remove(head + hash + "_" + tail)
		if _, err := os.Stat(head + hash + "tmptmp" + tail); err == nil {
			os.Remove(head + hash + "tmptmp" + tail)
		}
	}

	src, err := os.Open(head + hash + tail) // 元ファイル
	if err != nil {
		panic(err)
	}
	defer src.Close()
	c, err := ioutil.ReadAll(src)
	if err != nil {
		fmt.Printf("Error")
	}

	slice_ := strings.Split(string(c), ";")
	l := len(slice_)
	switch string(slice_[l-1][0]) {
	case "B":
		turn = -1
	case "W":
		turn = 1
	}
	fmt.Printf("turn is :\n")
	fmt.Println(turn)
	fmt.Printf("\n")
	return turn
}

func decode(str, name string) {
	str = strings.Split(str, ",")[1]
	filename := "./assets/thumbnail/" + name + ".png"
	data, _ := base64.StdEncoding.DecodeString(str) //[]byte

	file, _ := os.Create(filename)
	defer file.Close()
	fmt.Printf(filename + "\n")
	file.Write(data)
	createTextfile(name)
}

func createTextfile(name string) {
	file, _ := os.Create("./assets/html/" + name + ".html")
	defer file.Close()
	lines := []string{"<meta name=\"twitter:card\" content=\"summary_large_image\" />",
		"<meta name=\"twitter:site\" content=\"Mr_isoy\" />",
		"<meta name=\"twitter:title\" content=\"碁色\" />",
		"<meta name=\"twitter:description\" content=\"碁色(ごいろ)は初心者でもわかりやすい囲碁のゲームです。\" />",
		"<meta name=\"twitter:image\" content=\"https://goiro.net/thumbnail/" + name + ".png\" />\n",
		"<script>setTimeout(function () {window.location = 'https://goiro.net';}, 100);</script>\n"}
	for _, line := range lines {
		b := []byte(line)
		file.Write(b)
	}
}
