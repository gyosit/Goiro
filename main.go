/***
* サーバー公開
* 検討機能
・back/forwardの挙動が安定しないので確認
-----
* 見学機能
* パスワード
* 自動申込
・棋譜の上書き
------
* 石の繋がり表示
***/
package main

import (
		"fmt"
		"./crypto"
		"./ex_gnugo"
		"./sessionmanager"
		"net/http"
		//"net"
		//"net/http/fcgi"
		"github.com/gin-gonic/gin"
		"github.com/gin-contrib/sessions"
		"github.com/gin-contrib/sessions/cookie"
		"database/sql"
		"log"
		"strings"
		"os"
		"io"
		"io/ioutil"
		"strconv"
		"time"
		"math/rand"
		"gopkg.in/olahol/melody.v1"
		"github.com/jinzhu/gorm"
		_ "github.com/jinzhu/gorm/dialects/mysql"
)

type User struct{
	gorm.Model
	Username string `form:"username" binding:"required" gorm:"unique;not null"`
	Password string `form:"pass" binding:"required"`
}

type Play struct{
	gorm.Model
	Birth string
	Name string `form:"name"`
	Hash string
	Password string `form:"pass"`
	Owner string
	Black string
	White string
	Size int `form:"size" binding:"required"`
	Hande int `form:"hande"`
	Komi float64 `form:"komi" gorm:"not null"`
	Time int
	Winner string
	Status int // 0:Ready 1:Playing 2:Closed 3:Review
}

type SessionInfo struct{
	Username interface{}
	IsSessionAlive bool
}

type playerKeys struct{
	hash string
	turn int // black:1, white:-1
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
	var count int

	// Session
	//store := cookie.NewStore([]byte("secret"))
	//router.Use(sessions.Sessions("mysession", store))

	router.LoadHTMLGlob("views/*.html")
	router.Static("/assets", "./assets")

	router.GET("/", func(ctx *gin.Context){
		username := SessionManager.GetUser(ctx)
		ctx.HTML(http.StatusOK, "index.html", gin.H{"username": username})
	})

	router.GET("/play/:user/:room", func(ctx *gin.Context){
		user := SessionManager.GetUser(ctx)
		var mode string
		hash := ctx.Param("room")
		room := getRoom(hash)
		size := strconv.Itoa(room.Size)
		switch(room.Black == "COM" || room.White == "COM"){
		case true:
			mode = "ai"
		case false:
			mode = "normal"
		}
		if room.Black == room.White{
			mode = "free"
		}
		if user == ""{
			user = "GUEST"
		}
		if user != ctx.Param("user"){
			ctx.Redirect(302, "/play/"+user+"/"+hash)
		}
		if mode == "ai"{
			if player[playerKeys{hash, turn[hash]}] == "COM"{
				best := ex_gnugo.FirstPlay(hash, turn[hash], room.Size, 5)
				turn[hash] *= -1
				if best == "tt"{
					pass[hash]++
				}
			}
		}
		ctx.HTML(http.StatusOK, "play.html", gin.H{"mode": mode, "user": user, "size": size})
	})

	router.GET("/playreview/:room", func(ctx *gin.Context){
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
		if new_hash, err := createRoom(old_room); err != nil{
			ctx.HTML(http.StatusBadRequest, "index.html", gin.H{"err": err})
			fmt.Println(err)
			ctx.Abort()
		}else{
			if user == ""{
				user = "GUEST"
			}
			new_room := getRoom(new_hash)
			new_room.Owner = "FREE"
			updateRoom(new_hash, new_room)
			head := "./assets/kifu/"
			tail := ".sgf"
			src, err := os.Open(head+original.Hash+tail)
			if err != nil {
					panic(err)
			}
			defer src.Close()
	
			dst, err := os.Create(head+new_room.Hash+tail)
			if err != nil {
					panic(err)
			}
			defer dst.Close()
	
			_, err = io.Copy(dst, src)
			if  err != nil {
					panic(err)
			}
			if user != ctx.Param("user"){
				ctx.Redirect(302, "/play/"+user+"/"+new_hash)
			}

			player[playerKeys{new_hash, 1}] = user
			player[playerKeys{new_hash, -1}] = user
			switch{
			case new_room.Hande < 2:
				turn[new_hash] = 1
			default:
				turn[new_hash] = -1
			}
			pass[new_hash] = 0

			ctx.HTML(http.StatusOK, "play.html", gin.H{"mode": mode, "user": user, "size": size})
		}
	})

	router.GET("/play/:user/:room/ws", func(ctx *gin.Context){
		fmt.Printf("GOOD JOB!!!!")
		m.HandleRequest(ctx.Writer, ctx.Request)
	})

	router.GET("/goto", func(ctx *gin.Context){
		hash := ctx.Query("room")
		user := SessionManager.GetUser(ctx)
		challanger := SessionManager.GetUser(ctx)
		room := getRoom(hash)
		switch{
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

	router.GET("/regist", func(ctx *gin.Context){
		ctx.HTML(200, "regist.html", gin.H{})
	})

	router.GET("/login", func(ctx *gin.Context){
		ctx.HTML(200, "login.html", gin.H{})
	})

	router.GET("/logout", func(ctx *gin.Context){
		SessionManager.Logout(ctx)
		ctx.Redirect(302, "/")
	})

	router.GET("/rooms", func(ctx *gin.Context){
		rooms := getRooms()
		fmt.Println(rooms)
		ctx.HTML(200, "rooms.html", gin.H{"rooms": rooms})
	})

	router.GET("/review", func(ctx *gin.Context){
		user := SessionManager.GetUser(ctx)
		rooms := getMyRooms(user)
		ctx.HTML(200, "review.html", gin.H{"user": user, "rooms": rooms})
	})

	router.POST("/regist", func(ctx *gin.Context){
		var form User
		if err := ctx.Bind(&form); err != nil{
			ctx.HTML(http.StatusBadRequest, "login.html", gin.H{"err": err})
			ctx.Abort()
		}else{
			username := ctx.PostForm("username")
			pass := ctx.PostForm("pass")
			if err := createUser(username, pass); err != nil{
				fmt.Printf("Already user\n")
				ctx.HTML(http.StatusBadRequest, "login.html", gin.H{"err": err})
				fmt.Println(err)
			}
			ctx.Redirect(302, "/login")
		}
	})

	router.POST("/login", func(ctx *gin.Context){
		var form User
		if err := ctx.Bind(&form); err != nil{
			ctx.HTML(http.StatusBadRequest, "login.html", gin.H{"err": err})
			ctx.Abort()
		}else{
			username := ctx.PostForm("username")
			pass := ctx.PostForm("pass")
			ex_pass := getUser(username).Password
			if err := crypto.CompareHashAndPassword(ex_pass, pass); err != nil{
				fmt.Printf("No User\n")
				fmt.Println(err)
				ctx.HTML(http.StatusBadRequest, "login.html", gin.H{"err": err})
			}else{
				SessionManager.Login(ctx, username)
				ctx.Redirect(302, "/")
			}
		}
	})

	router.POST("/create_room", func(ctx *gin.Context){
		var form Play
		if err := ctx.Bind(&form); err != nil{
			fmt.Printf("BindError!!!!!\n")
			fmt.Println(err)
			ctx.HTML(http.StatusBadRequest, "index.html", gin.H{"err": err})
			ctx.Abort()
		}
		username := SessionManager.GetUser(ctx)
		form.Owner = username
		if hash_room, err := createRoom(form); err != nil{
			ctx.HTML(http.StatusBadRequest, "index.html", gin.H{"err": err})
			fmt.Println(err)
			ctx.Abort()
		}else{
			//ex_gnugo.CreateKifu(form.Size, form.Hande, form.Komi, hash_room)
			fmt.Printf("Redirect!\n")
			room := getRoom(hash_room)
			switch(ctx.PostForm("turn")){
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

	router.POST("/ai_room", func(ctx *gin.Context){
		var form Play
		how_turn := ctx.PostForm("turn")
		if err := ctx.Bind(&form); err != nil{
			fmt.Printf("BindError!!!!!\n")
			fmt.Println(err)
			ctx.HTML(http.StatusBadRequest, "index.html", gin.H{"err": err})
			ctx.Abort()
		}
		username := SessionManager.GetUser(ctx)
		form.Owner = username
		if hash_room, err := createRoom(form); err != nil{
			ctx.HTML(http.StatusBadRequest, "index.html", gin.H{"err": err})
			fmt.Println(err)
			ctx.Abort()
		}else{
			ex_gnugo.InitKifu(form.Size, form.Hande, form.Komi, "*black*", "*white*", "*data*", hash_room)
			room := applyPlay(hash_room, "COM", how_turn)
			player[playerKeys{hash_room, 1}] = room.Black
			player[playerKeys{hash_room, -1}] = room.White
			switch{
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

	router.POST("/free_room", func(ctx *gin.Context){
		var form Play
		if err := ctx.Bind(&form); err != nil{
			fmt.Printf("BindError!!!!!\n")
			fmt.Println(err)
			ctx.HTML(http.StatusBadRequest, "index.html", gin.H{"err": err})
			ctx.Abort()
		}
		username := SessionManager.GetUser(ctx)
		form.Owner = username
		if hash_room, err := createRoom(form); err != nil{
			ctx.HTML(http.StatusBadRequest, "index.html", gin.H{"err": err})
			fmt.Println(err)
			ctx.Abort()
		}else{
			ex_gnugo.InitKifu(form.Size, form.Hande, form.Komi, "*black*", "*white*", "*data*", hash_room)
			room := applyPlay(hash_room, username, "nigiri")
			player[playerKeys{hash_room, 1}] = room.Black
			player[playerKeys{hash_room, -1}] = room.White
			switch{
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

	m.HandleConnect(func(s *melody.Session){
		enters[s.Request.URL.Path] += 1
		fmt.Printf("Connect\n")
		sendClient(m, s, "connected", false)
	})
	
	m.HandleDisconnect(func(s *melody.Session){
		url := s.Request.URL.Path
		fmt.Printf("DISCONNECT\n")
		enters[url] -= 1
		fmt.Println(enters[url])
		hash := strings.Split(url, "/")[3]
		fmt.Printf(hash)
		fmt.Printf("\n")
		room := getRoom(hash)
		fmt.Println(room)
		if room.Status == 0 && enters[url] < 1{
			deleteRoom(room.Hash)
			fmt.Printf("deleted\n")
		}
	})
		
	m.HandleMessage(func(s *melody.Session, msg []byte){
		head := "./assets/kifu/"
		tail := ".sgf"
		user := strings.Split(s.Request.URL.Path, "/")[2]
		hash := strings.Split(s.Request.URL.Path, "/")[3]
		original_hash := hash
		room := getRoom(hash)
		parse := strings.Split(string(msg), " ")
		senrigan := false
		fmt.Printf(parse[0])
		fmt.Println(turn[hash])
		_, err := os.Stat(head+hash+"_"+user+tail); if err == nil{
			senrigan = true
			hash = hash + "_" + user
			switch parse[0]{
			case "coordinate_ai":
				parse[0] = "coordinate"
			}
		}
		fmt.Println(hash)

		switch parse[0]{
		case "coordinate":
			if user != player[playerKeys{hash, turn[hash]}]{
				break
			}
			if _, err := os.Stat(head+hash+"tmp"+tail); err == nil{
				if _, err := os.Stat(head+hash+"_"+tail); err != nil{
					copyFile(hash, "_")
				}
			}
			i, _ := strconv.Atoi(parse[1])
			res, score, board, _ := ex_gnugo.PlayStone(hash, turn[hash], i, room.Size, 0)
			if res != "Illegal"{
				turn[hash] *= -1
				pass[hash] = 0
				sendClient(m, s, "board:"+board, true)
				sendClient(m, s, "score:"+score, true)
			}
			if _, err := os.Stat(head+hash+"tmp"+tail); err == nil{
				copyFile(hash, "tmptmp")
			}
		case "coordinate_ai":
			if user != player[playerKeys{hash, turn[hash]}]{
				break
			}
			i, _ := strconv.Atoi(parse[1])
			level, _ := strconv.Atoi(parse[2])
			res, score, board, _ := ex_gnugo.PlayStone(hash, turn[hash], i, room.Size, level)
			if res != "Illegal"{
				pass[hash] = 0
				c_b, c_w := ex_gnugo.CapturedStone(hash)
				sendClient(m, s, "board:"+board, true)
				sendClient(m, s, "captured:"+c_b+","+c_w, true)
				sendClient(m, s, "score:"+score, true)
				last := ex_gnugo.CheckTurn(hash, room.Size)
				sendClient(m, s, "turn:"+last, true)
				score, board, best := ex_gnugo.Genmove(hash, turn[hash], i, room.Size, level)
				c_b, c_w = ex_gnugo.CapturedStone(hash)
				sendClient(m, s, "board:"+board, true)
				sendClient(m, s, "captured:"+c_b+","+c_w, true)
				sendClient(m, s, "score:"+score, true)
				if best == "tt"{
					pass[hash]++
					sendClient(m, s, "pass", true)
					if pass[hash] > 1{
						sendClient(m, s, "busy", true)
						score = ex_gnugo.FinalScore(hash)
						endGame(hash, score)
						ex_gnugo.WriteScore(hash, score)
						turn[hash] = 2
						sendClient(m, s, "finalscore:"+score, true)
					}
				}else{
					pass[hash] = 0
				}
			}
		case "dragon":
			i, _ := strconv.Atoi(parse[1])
			res := ex_gnugo.HuntDragon(hash, turn[hash], i, room.Size)
			fmt.Printf(res)
			sendClient(m, s, "bless:"+res, false)
		case "pass":
			if user != player[playerKeys{hash, turn[hash]}]{
				break
			}
			sendClient(m, s, "pass", true)
			pass[hash]++
			ex_gnugo.Pass(hash, turn[hash], room.Size, 0)
			turn[hash] *= -1
			var score string
			if pass[hash] > 1{
				sendClient(m, s, "busy", true)
				score = ex_gnugo.FinalScore(hash)
				endGame(hash, score)
				ex_gnugo.WriteScore(hash, score)
				turn[hash] = 2
				sendClient(m, s, "finalscore:"+score, true)
			}else{
				score =  ex_gnugo.EstimateScore(hash)
				sendClient(m, s, "score:"+score, true)
			}
		case "pass_ai":
			if user != player[playerKeys{hash, turn[hash]}]{
				break
			}
			pass[hash]++
			level, _ := strconv.Atoi(parse[1])
			if pass[hash] < 2{
				score, board, best := ex_gnugo.Pass(hash, turn[hash], room.Size, level)
				if best == "tt"{
					// End this game by AI
					sendClient(m, s, "busy", true)
					score = ex_gnugo.FinalScore(hash)
					endGame(hash, score)
					ex_gnugo.WriteScore(hash, score)
					turn[hash] = 2
					sendClient(m, s, "finalscore:"+score, true)
				}else{
					// Continue this game
					pass[hash] = 0
					sendClient(m, s, "board:"+board, true)
					sendClient(m, s, "score:"+score, true)
				}
			}else{
				// End this game by the user
				ex_gnugo.Pass(hash, turn[hash], 9, 0)
				sendClient(m, s, "busy", true)
				score := ex_gnugo.FinalScore(hash)
				endGame(hash, score)
				ex_gnugo.WriteScore(hash, score)
				turn[hash] = 2
				sendClient(m, s, "finalscore:"+score, true)
			}
		case "resign":
			if user != player[playerKeys{hash, turn[hash]}]{
				fmt.Println(player[playerKeys{hash, turn[hash]}])
				break
			}
			resign := ex_gnugo.Resign(hash, turn[hash])
			endGame(hash, resign)
			resign = resign
			if resign == "B+R"{
				turn[hash] = 3
			}else{
				turn[hash] = -3
			}
			pass[hash] = 0
			sendClient(m, s, "finalscore:"+resign, true)
		case "senrigan":
			if !senrigan{
				copySenrigan(hash, user, true)
				turn[hash+"_"+user] = turn[hash]
				player[playerKeys{hash+"_"+user, 1}] = user
				player[playerKeys{hash+"_"+user, -1}] = user
			}else{
				copySenrigan(hash, user, false)
				hash = original_hash
				board := ex_gnugo.ShowInfluence(hash, turn[hash], room.Size)
				sendClient(m, s, "board:"+board, true)
				score := ex_gnugo.EstimateScore(hash)
				sendClient(m, s, "score:"+score, true)	
			}
		case "show":
			room := getRoom(hash)
			sendClient(m, s, "player:"+room.Black+","+room.White, true)
			var score string
			if(room.Status == 2){
				score = room.Winner
				board := ex_gnugo.ShowInfluence(hash, 1, room.Size)
				sendClient(m, s, "board:"+board, true)
				sendClient(m, s, "finalscore:"+score, true)
			}else{
				if turn[hash] == 0{
					turn[hash] = 1
				}
				board := ex_gnugo.ShowInfluence(hash, turn[hash], room.Size)
				sendClient(m, s, "board:"+board, true)
				score := ex_gnugo.EstimateScore(hash)
				sendClient(m, s, "score:"+score, true)			
			}
		case "back":
			copyFile(hash, "tmp")
			turn[hash] = editKifu(hash, -1)
			board := ex_gnugo.ShowBoard(hash)
			sendClient(m, s, "board:"+board, true)
			go func(count *int){
				*count++
				time.Sleep(time.Second * 1)
				if *count < 2{
					board := ex_gnugo.ShowInfluence(hash, turn[hash], room.Size)
					sendClient(m, s, "board:"+board, true)
					score := ex_gnugo.EstimateScore(hash)
					sendClient(m, s, "score:"+score, true)
				}
				*count--
			}(&count)
		case "forward":
			if _, err := os.Stat(head+hash+"tmp"+tail); err == nil{
				turn[hash] = editKifu(hash, 1)
				board := ex_gnugo.ShowBoard(hash)
				sendClient(m, s, "board:"+board, true)
				go func(count *int){
					*count++
					time.Sleep(time.Second * 1)
					if *count < 2{
						board := ex_gnugo.ShowInfluence(hash, turn[hash], room.Size)
						sendClient(m, s, "board:"+board, true)
						score := ex_gnugo.EstimateScore(hash)
						sendClient(m, s, "score:"+score, true)
					}
					*count--
				}(&count)
			}
		case "resume":
			turn[hash] = resumeKifu(hash)
			board := ex_gnugo.ShowInfluence(hash, turn[hash], room.Size)
			sendClient(m, s, "board:"+board, true)
			score := ex_gnugo.EstimateScore(hash)
			sendClient(m, s, "score:"+score, true)
		case "override":
			turn[hash] = overrideKifu(hash)
		case "head":
			copyFile(hash, "tmp")
			turn[hash] = editKifu(hash, -100)
			board := ex_gnugo.ShowInfluence(hash, turn[hash], room.Size)
			sendClient(m, s, "board:"+board, true)
			score := ex_gnugo.EstimateScore(hash)
			sendClient(m, s, "score:"+score, true)
		case "end":
			showEnd(hash)
			board := ex_gnugo.ShowInfluence(hash, turn[hash], room.Size)
			sendClient(m, s, "board:"+board, true)
			score := ex_gnugo.EstimateScore(hash)
			sendClient(m, s, "score:"+score, true)
		}
		last := ex_gnugo.CheckTurn(hash, room.Size)
		sendClient(m, s, "turn:"+last, true)
	})

	router.Run(":1780")
}

func execDB(db *sql.DB, q string){
	if _, err := db.Exec(q); err != nil{
		log.Fatal(err)
	}
}

func dbInit(){
	db := gormConnect()
	defer db.Close()
	db.AutoMigrate(&User{})
	db.AutoMigrate(&Play{})
}

func createUser(username string, pass string) []error{
	passwordEncrypt, _ := crypto.PasswordEncrypt(pass)
	db := gormConnect()
	defer db.Close()
	if err :=  db.Create(&User{Username: username, Password: passwordEncrypt}).GetErrors(); len(err)!=0 {
		fmt.Println(err)
		return err
	}
	return nil
}

func createRoom(play Play) (string, []error){
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

	if err := db.Create(&play).GetErrors(); len(err)!=0{
		fmt.Println(err)
		return "", err
	}
	fmt.Println(play)
	return hash_t, nil
}

func getUser(username string) User{
	db := gormConnect()
	var user User
	db.First(&user, "username = ?", username)
	db.Close()
	return user
}

func getRoom(hash string) Play{
	db := gormConnect()
	var room Play
	db.First(&room, "hash = ?", hash)
	db.Close()
	return room
}

func updateRoom(hash string, newroom Play){
	db := gormConnect()
	var room Play
	db.First(&room, "hash = ?", hash)
	room = newroom
	db.Save(&room)
	db.Close()
}

func deleteRoom(hash string){
	db := gormConnect()
	var room Play
	db.First(&room, "hash = ?", hash)
	db.Unscoped().Delete(&room)
	db.Close()
}

func endGame(hash , score string){
	db := gormConnect()
	var room Play
	db.First(&room, "hash = ?", hash)
	room.Status = 2
	room.Winner = score
	db.Save(&room)
	db.Close()
}

func getRooms() []Play{
	db := gormConnect()
	var rooms []Play
	db.Where("status = ? OR status = ?", "0", "1").Find(&rooms)
	db.Close()
	return rooms
}

func getMyRooms(user string) []Play{
	db := gormConnect()
	var rooms []Play
	db.Where("black = ? OR white = ?", user, user).Find(&rooms)
	db.Close()
	for i, j:= 0, len(rooms)-1; i<j; i, j = i+1, j-1 {
		rooms[i], rooms[j] = rooms[j], rooms[i]
	}
	return rooms
}

func applyPlay(hash, challanger, how_turn string) Play{
	db := gormConnect()
	var room Play
	db.First(&room, "hash = ?", hash)
	owner := room.Owner
	rand.Seed(time.Now().UnixNano())
	switch how_turn{
	case "ignore":
		if room.Black == "" && room.White == ""{
			how_turn = "nigiri"
		}else if room.Black == "" && room.White != ""{
			how_turn = "white"
		}else{
			how_turn = "black"
		}
		fallthrough
	case "nigiri":
		rnd := rand.Intn(2)
		switch rnd{
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

func gormConnect() *gorm.DB{
	DBMS := "mysql"
	USER := "igo"
	PASS := "Ss4071132019_igo"
	DBNAME := "igo?parseTime=true"

	CONNECT := USER + ":" + PASS + "@" + "/" + DBNAME
	db, err := gorm.Open(DBMS, CONNECT)

	if err != nil{
		panic(err.Error())
	}
	return db
}

func sendClient(m *melody.Melody, s *melody.Session, msg string, everyone bool){
	if everyone{
		m.BroadcastFilter([]byte(msg), func(q *melody.Session) bool{
			q_hash := strings.Split(q.Request.URL.Path, "/")[3]
			s_hash := strings.Split(s.Request.URL.Path, "/")[3]
			return q_hash == s_hash
		})
	}else{
		m.BroadcastFilter([]byte(msg), func(q *melody.Session) bool{
			q_user := strings.Split(q.Request.URL.Path, "/")[2]
			s_user := strings.Split(s.Request.URL.Path, "/")[2]
			q_hash := strings.Split(q.Request.URL.Path, "/")[3]
			s_hash := strings.Split(s.Request.URL.Path, "/")[3]
			return q_user == s_user && q_hash == s_hash
		})
	}
}

func copyFile(hash, add string) {
	head := "./assets/kifu/"
	tail := ".sgf"
	_, err := os.Stat(head+hash+add+tail); if err != nil || add != "tmp"{
		// tmpファイルが存在しないときにコピーを作成する
		fmt.Printf("Copy Files\n")
		src, err := os.Open(head+hash+tail)
		if err != nil {
				panic(err)
		}
		defer src.Close()

		dst, err := os.Create(head+hash+add+tail)
		if err != nil {
				panic(err)
		}
		defer dst.Close()

		_, err = io.Copy(dst, src)
		if  err != nil {
				panic(err)
		}
	}
}

func copySenrigan(hash, user string, copy bool){
	head := "./assets/kifu/"
	add := "_" + user
	tail := ".sgf"
	switch copy{
	case true:
		src, err := os.Open(head+hash+tail)
			if err != nil {
					panic(err)
			}
			defer src.Close()

			dst, err := os.Create(head+hash+add+tail)
			if err != nil {
					panic(err)
			}
			defer dst.Close()

			_, err = io.Copy(dst, src)
			if  err != nil {
					panic(err)
			}
	case false:
		if err := os.Remove(head+hash+tail); err != nil {
			fmt.Println(err)
		}
	}
}

func deleteFile(hash string) {
	head := "./assets/kifu/"
	tail := ".sgf"
	if err := os.Remove(head+hash+"tmptmp"+tail); err != nil {
		fmt.Println(err)
	}
	if err := os.Remove(head+hash+"_"+tail); err != nil {
		fmt.Println(err)
	}
}

func showEnd(hash string) {
	head := "./assets/kifu/"
	tail := ".sgf"
	var add string
	_, err := os.Stat(head+hash+"tmptmp"+tail); if err == nil{
		add = "tmptmp"
	}else{
		add = "tmp"
	}
	if err := os.Rename(head+hash+add+tail, head+hash+tail); err != nil {
		fmt.Println(err)
	}
	src, err := os.Open(head+hash+tail)
		if err != nil {
				panic(err)
		}
		defer src.Close()

		dst, err := os.Create(head+hash+add+tail)
		if err != nil {
				panic(err)
		}
		defer dst.Close()

		_, err = io.Copy(dst, src)
		if  err != nil {
				panic(err)
		}
}

func editKifu(hash string, step int) int{
	head := "./assets/kifu/"
	tail := ".sgf"
	tmp := "tmp"
	var turn int
	if _, err := os.Stat(head+hash+"tmp"+tail); err == nil{
		// tmpファイルがあるときにそれを元に棋譜ファイルを作成する
		if _, err := os.Stat(head+hash+"tmptmp"+tail); err == nil{
			// tmptmpファイルがあるときはこちらを元にする
			tmp = "tmptmp"
		}
		dst, err := os.OpenFile(head+hash+tail, os.O_RDWR, 0664) // 現在の譜面
		if err != nil {
				panic(err)
		}
		b, err := ioutil.ReadAll(dst); if err != nil{
			fmt.Printf("Error")
		}
		defer dst.Close()
		slice := strings.Split(string(b), ";")
		new_step := len(slice) + step - 1

		src, err := os.Open(head+hash+tmp+tail) // 元ファイル
		if err != nil {
				panic(err)
		}
		defer dst.Close()
		c, err := ioutil.ReadAll(src); if err != nil{
			fmt.Printf("Error")
		}
		
		slice_ := strings.Split(string(c), ";")
		if new_step < 2{
			new_step = 2
		}
		if new_step > len(slice_)-1{
			new_step = len(slice_)-1
		}
		fmt.Println(slice_)
		fmt.Println(new_step)
		fmt.Printf("\n")
		switch(string(slice_[new_step][0])){
		case "B":
			turn = -1
		case "W":
			turn = 1
		}
		new_sentence := strings.Join(slice_[:new_step+1], ";") + ")"
		new_sentence = strings.Replace(new_sentence, "))", ")", -1)

		dst, err = os.Create(head+hash+tail)
		if err == nil {
			_, err = dst.WriteString(new_sentence); if err != nil{
				fmt.Println(err)
			}
		}
		defer dst.Close()
	}
	return turn
}

func resumeKifu(hash string) int{
	head := "./assets/kifu/"
	tail := ".sgf"
	var turn int
	if _, err := os.Stat(head+hash+"tmptmp"+tail); err == nil{
		// tmptmpファイルがあるときにそれを削除する
		os.Remove(head+hash+"tmptmp"+tail)
		os.Remove(head+hash+tail)
		os.Rename(head+hash+"_"+tail, head+hash+tail)
	}

	src, err := os.Open(head+hash+tail) // 元ファイル
	if err != nil {
			panic(err)
	}
	defer src.Close()
	c, err := ioutil.ReadAll(src); if err != nil{
		fmt.Printf("Error")
	}
	
	slice_ := strings.Split(string(c), ";")
	l := len(slice_)
	switch(string(slice_[l-1][0])){
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

func overrideKifu(hash string) int{
	head := "./assets/kifu/"
	tail := ".sgf"
	var turn int
	if _, err := os.Stat(head+hash+"tmp"+tail); err == nil{
		os.Remove(head+hash+"tmp"+tail)
		os.Remove(head+hash+"_"+tail)
		if _, err := os.Stat(head+hash+"tmptmp"+tail); err == nil{
			os.Remove(head+hash+"tmptmp"+tail)
		}
	}

	src, err := os.Open(head+hash+tail) // 元ファイル
	if err != nil {
			panic(err)
	}
	defer src.Close()
	c, err := ioutil.ReadAll(src); if err != nil{
		fmt.Printf("Error")
	}
	
	slice_ := strings.Split(string(c), ";")
	l := len(slice_)
	switch(string(slice_[l-1][0])){
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