package ex_gnugo

import (
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"strconv"
	"strings"
	//"golang.org/x/exp/utf8string"
)

func integralCmd(cmds []string) string {
	fmt.Printf("===EXE===\n")
	var res string
	for _, cmd := range cmds {
		fmt.Printf(cmd + "\n")
		res += (cmd + "\n")
	}
	return res
}

func ExecCommand(param ...string) []string {
	var res []string
	var goiro_level string
	if len(param) == 1 {
		goiro_level = "1"
	} else {
		goiro_level = param[1]
	}
	//cmd := "loadsgf test.sgf\\ninitial_influence white influence_regions"
	cmd := "echo \"\n" + param[0] + "\" | ./gnugo-3.8/interface/gnugo --mode gtp --goiro-level " + goiro_level
	out, _ := exec.Command("sh", "-c", cmd).Output()
	s := string(out)
	slice := strings.Split(s, "\n")
	fmt.Printf("\n")
	for i, v := range slice {
		//v = strings.Replace(v, "= ", "", -1)
		if len(v) > 0 {
			res = append(res, v)
			fmt.Println(i, v)
		}
	}
	return res
}

func CreateKifu(size, hande int, komi float64, hash string) {
	cmds := []string{"boardsize " + strconv.Itoa(size),
		"komi " + strconv.FormatFloat(komi, 'f', 4, 64),
		//"fixed_handicap "+strconv.Itoa(hande),
		"printsgf ./assets/kifu/" + hash + ".sgf"}
	cmd := integralCmd(cmds)
	ExecCommand(cmd)
}

func PlayStone(hash string, color int, i int, size int, ai int) (string, string, string, string) {
	s_color := map[int]string{1: "black", -1: "white"}

	point_gnugo := TransCoordinate(i, size, true)
	cmds := []string{"loadsgf ./assets/kifu/" + hash + ".sgf",
		"play " + s_color[color] + " " + point_gnugo}
	cmd := integralCmd(cmds)
	res := ExecCommand(cmd)
	if len(res) < 1 {
		point := TransCoordinate(i, size, false)
		uploadKifu(s_color[color], point, hash)
		fmt.Printf(point)
		return "Regal", "", "", "best"
	} else {
		fmt.Printf("Illegel move!")
		return "Illegal", "", "", ""
	}
}

func Genmove(hash string, color int, i int, size int, ai int, goiro_level int) (string, string, string, string) {
	s_color := map[int]string{1: "black", -1: "white"}
	cmds := []string{"loadsgf ./assets/kifu/" + hash + ".sgf",
		"level " + strconv.Itoa(ai),
		"genmove_" + s_color[color*(-1)],
		"estimate_score",
		"initial_goiroinfluence " + s_color[color] + " influence_regions"}

	cmd := integralCmd(cmds)
	goiro_level_str := strconv.Itoa(goiro_level)
	res := ExecCommand(cmd, goiro_level_str)
	// if len(res) < (9+size+1){
	// 	return "", "", "tt"
	// }
	score := res[1]
	best_i, _ := strconv.Atoi(UnTransCoordinate(res[0], size, true))
	best := TransCoordinate(best_i, size, false)
	uploadKifu(s_color[color*(-1)], best, hash)
	influence := parseBoard_line(res[2])
	alive_dead := parseBoard_line(res[3])
	return score, influence, best, alive_dead
}

func FirstPlay(hash string, color int, size int, level int, goiro_level int) string {
	s_color := map[int]string{1: "black", -1: "white"}
	cmds := []string{"loadsgf ./assets/kifu/" + hash + ".sgf",
		"level " + strconv.Itoa(level),
		"genmove_" + s_color[color]}
	cmd := integralCmd(cmds)
	goiro_level_str := strconv.Itoa(goiro_level)
	res := ExecCommand(cmd, goiro_level_str)
	best_i, _ := strconv.Atoi(UnTransCoordinate(res[0], size, true))
	best := TransCoordinate(best_i, size, false)
	uploadKifu(s_color[color], best, hash)
	return best
}

func Pass(hash string, color int, size int, level int, goiro_level int) (string, string, string, string) {
	s_color := map[int]string{1: "black", -1: "white"}
	uploadKifu(s_color[color], "tt", hash)
	var score, best, influence string
	cmds := []string{"loadsgf ./assets/kifu/" + hash + ".sgf",
		"level " + strconv.Itoa(level),
		"genmove_" + s_color[color*(-1)],
		"estimate_score",
		"initial_goiroinfluence " + s_color[color] + " influence_regions"}
	cmd := integralCmd(cmds)
	goiro_level_str := strconv.Itoa(goiro_level)
	res := ExecCommand(cmd, goiro_level_str)
	// if len(res) < (9+size+1){
	// 	return "", "", "tt"
	// }
	score = res[1]
	best_i, _ := strconv.Atoi(UnTransCoordinate(res[0], size, true))
	best = TransCoordinate(best_i, size, false)
	uploadKifu(s_color[color*(-1)], best, hash)
	influence = parseBoard_line(res[2])
	alive_dead := parseBoard_line(res[3])
	return score, influence, best, alive_dead
}

func Pass_nonai(hash string, color int) {
	s_color := map[int]string{1: "black", -1: "white"}
	uploadKifu(s_color[color], "tt", hash)
}

func Resign(hash string, color int) string {
	var s_color string
	switch color {
	case 1:
		s_color = "W"
	case -1:
		s_color = "B"
	}
	WriteScore(hash, s_color+"+R")
	return s_color + "+R"
}

func WriteScore(hash, score string) {
	f, err := os.Open("./assets/kifu/" + hash + ".sgf")
	if err != nil {
		fmt.Println(err)
	}
	defer f.Close()
	b, err := ioutil.ReadAll(f)
	if err != nil {
		fmt.Printf("Error2")
	}
	content := strings.Replace(string(b), "*RESULT*", score, 1)
	file, err := os.Create("./assets/kifu/" + hash + ".sgf")
	if err != nil {
		fmt.Printf("err")
	} else {
		_, err := file.WriteString(content)
		if err != nil {
			fmt.Printf("err")
		}
	}
}

func HuntDragon(hash string, color int, i int, size int) string {
	var tmp []string
	/*var s_color string
	switch color{
	case 1:
		s_color = "black"
	case -1:
		s_color = "white"
	}
	*/

	point := TransCoordinate(i, size, true)
	cmds := []string{"loadsgf ./assets/kifu/" + hash + ".sgf",
		"findlib " + point}
	cmd := integralCmd(cmds)
	res := ExecCommand(cmd)
	if res[0] != "vertex must not be empty" {
		slice := strings.Split(res[0], " ")
		for _, v := range slice {
			v = UnTransCoordinate(v, size, true)
			tmp = append(tmp, v)
		}
		final_res := strings.Join(tmp, ",")
		return final_res
	} else {
		return "Empty"
	}
}

func ShowBoard(hash string) string {
	cmds := []string{"loadsgf ./assets/kifu/" + hash + ".sgf",
		"showgoiroboard"}
	cmd := integralCmd(cmds)
	res := ExecCommand(cmd)
	parsed_board := parseBoard_line(res[0])
	parsed_board = strings.Replace(parsed_board, "O", "4", -1)
	parsed_board = strings.Replace(parsed_board, "X", "-4", -1)
	//parsed_board = strings.Replace(parsed_board, ".", "0", -1)
	//parsed_board = strings.Replace(parsed_board, "+", "0", -1)
	return parsed_board
}

func CapturedStone(hash string) (string, string) {
	cmds := []string{"loadsgf ./assets/kifu/" + hash + ".sgf",
		"captures black",
		"captures white"}
	cmd := integralCmd(cmds)
	res := ExecCommand(cmd)
	black := res[0]
	white := res[1]
	return black, white
}

func ShowInfluence(hash string, color int, size int) (string, string, string, string, string) {
	s_color := map[int]string{1: "black", -1: "white"}
	cmds := []string{"loadsgf ./assets/kifu/" + hash + ".sgf",
		"initial_goiroinfluence " + s_color[color] + " influence_regions",
		"scan_values " + s_color[color]}
	cmd := integralCmd(cmds)
	res := ExecCommand(cmd)
	//parsed_board := parseBoard2(res[2:3+size])
	parsed_board := parseBoard_line(res[0])
	alive_dead := parseBoard_line(res[1])
	weakness := parseBoard_line(res[2])
	moyo := parseBoard_line(res[3])
	values := parseBoard_line(res[4])

	return parsed_board, alive_dead, weakness, moyo, values
}

func EstimateScore(hash string) string {
	cmds := []string{"loadsgf ./assets/kifu/" + hash + ".sgf",
		"estimate_score"}
	cmd := integralCmd(cmds)
	res := ExecCommand(cmd)
	return res[0]
}

func FinalScore(hash string) string {
	cmds := []string{"loadsgf ./assets/kifu/" + hash + ".sgf",
		"final_score"}
	cmd := integralCmd(cmds)
	res := ExecCommand(cmd)
	return res[0]
}

func parseBoard(boards []string) string {
	size := len(boards)
	boards = boards[4 : size-3]
	var res []string
	size_tmp := len(boards)
	for _, v := range boards {
		v = strings.TrimSpace(v)
		tmp := strings.Split(v, " ")
		tmp = tmp[1 : size_tmp+1]
		fmt.Println(tmp)
		res = append(res, strings.Join(tmp, ","))
	}
	final_res := strings.Join(res, ",")
	return final_res
}

func parseBoard2(boards []string) string {
	var res []string
	size := len(boards)
	boards = boards[0 : size-1]
	for _, v := range boards {
		v = strings.Replace(v, "= ", "", 1)
		v = strings.Replace(v, " 4", "4", -1)
		v = strings.Replace(v, " 3", "3", -1)
		v = strings.Replace(v, " 2", "2", -1)
		v = strings.Replace(v, " 1", "1", -1)
		v = strings.Replace(v, " 0", "0", -1)
		tmp := strings.Split(v, " ")
		tmp = tmp[:len(tmp)-1]
		res = append(res, strings.Join(tmp, ","))
	}
	final_res := strings.Join(res, ",")
	return final_res
}

func parseBoard_line(boards string) string {
	var res string
	boards = strings.TrimSpace(boards)
	res = strings.Replace(boards, "  ", " ", -1)
	res = strings.Replace(res, " ", ",", -1)
	return res
}

func TransCoordinate(c, size int, gnugo bool) string {
	if c == -1 {
		return "tt"
	}
	y := c / 100
	x := c - y*100
	if gnugo {
		if x > 7 {
			x++
		}
		s_x := string('A' + x)
		s_y := strconv.Itoa(size - y)
		return s_x + s_y
	} else {
		s_y := string('a' + y)
		s_x := string('a' + x)
		return s_x + s_y
	}
}

func UnTransCoordinate(c string, size int, gnugo bool) string {
	if c == "PASS" || c == "tt" {
		return "-1"
	}
	if !gnugo {
		c = strings.ToUpper(c)
	}
	s_x := c[:1]
	s_y := c[1:]
	x := int([]rune(s_x)[0] - 'A')
	var y int
	if gnugo {
		y, _ = strconv.Atoi(s_y)
		y = size - y
	} else {
		y = int([]rune(s_y)[0] - 'A')
	}
	if gnugo && x > 8 {
		x--
	}
	return strconv.Itoa(y*100 + x)
}

func makeHande(size, num int) string {
	var stones []string
	switch size {
	case 9:
		switch num {
		case 2:
			stones = []string{"gc", "cg"}
		case 3:
			stones = []string{"gc", "cg", "gg"}
		case 4:
			stones = []string{"gc", "cg", "gg", "cc"}
		case 5:
			stones = []string{"gc", "cg", "gg", "cc", "ee"}
		case 6:
			stones = []string{"gc", "cg", "gg", "cc", "ge", "ce"}
		case 7:
			stones = []string{"gc", "cg", "gg", "cc", "ee", "ge", "ce"}
		case 8:
			stones = []string{"gc", "cg", "gg", "cc", "ge", "ce", "ec", "eg"}
		case 9:
			stones = []string{"gc", "cg", "gg", "cc", "ge", "ce", "ec", "eg", "ee"}
		}
	case 13:
		switch num {
		case 2:
			stones = []string{"jd", "dj"}
		case 3:
			stones = []string{"jd", "dj", "jj"}
		case 4:
			stones = []string{"jd", "dj", "jj", "dd"}
		case 5:
			stones = []string{"jd", "dj", "jj", "dd", "gg"}
		case 6:
			stones = []string{"jd", "dj", "jj", "dd", "jg", "dg"}
		case 7:
			stones = []string{"jd", "dj", "jj", "dd", "gg", "jg", "dg"}
		case 8:
			stones = []string{"jd", "dj", "jj", "dd", "jg", "dg", "gd", "gj"}
		case 9:
			stones = []string{"jd", "dj", "jj", "dd", "jg", "dg", "gd", "gj", "gg"}
		}
	case 19:
		switch num {
		case 2:
			stones = []string{"pd", "dp"}
		case 3:
			stones = []string{"pd", "dp", "pp"}
		case 4:
			stones = []string{"pd", "dp", "pp", "dd"}
		case 5:
			stones = []string{"pd", "dp", "pp", "dd", "jj"}
		case 6:
			stones = []string{"pd", "dp", "pp", "dd", "pj", "dj"}
		case 7:
			stones = []string{"pd", "dp", "pp", "dd", "jj", "pj", "dj"}
		case 8:
			stones = []string{"pd", "dp", "pp", "dd", "pj", "dj", "jd", "jp"}
		case 9:
			stones = []string{"pd", "dp", "pp", "dd", "pj", "dj", "jd", "jp", "jj"}
		}
	}
	var put_stones string
	for _, v := range stones {
		put_stones += "B[" + v + "];"
	}
	if put_stones != "" {
		put_stones = ";" + put_stones
	}

	if put_stones == "" {
		return ""
	}
	return put_stones[:len(put_stones)-1]
}

func InitKifu(size, hande int, komi float64, b_player, w_player, date, hash string) {
	stones := makeHande(size, hande)
	content := "(;GM[1]SZ[" + strconv.Itoa(size) + "]CA[Shift_JIS]HA[" + strconv.Itoa(hande) + "]PB[" + b_player + "]PW[" + w_player + "]DT[" + date + "]RE[*RESULT*]KM[" + strconv.FormatFloat(komi, 'f', 2, 64) + "]TM[]RU[Japanese]" + stones + ")"
	file, err := os.Create("./assets/kifu/" + hash + ".sgf")
	if err != nil {
		fmt.Printf("err")
	} else {
		_, err := file.WriteString(content)
		if err != nil {
			fmt.Printf("err")
		}
	}
}

func ChangeKifu(hash, label, val string) {
	f, err := os.Open("./assets/kifu/" + hash + ".sgf")
	if err != nil {
		fmt.Println(err)
	}
	defer f.Close()
	b, err := ioutil.ReadAll(f)
	if err != nil {
		fmt.Printf("Error2")
	}
	content := strings.Replace(string(b), "*"+label+"*", val, 1)
	fmt.Printf(content)
	file, err := os.Create("./assets/kifu/" + hash + ".sgf")
	if err != nil {
		fmt.Printf("err")
	} else {
		_, err := file.WriteString(content)
		if err != nil {
			fmt.Printf("err")
		}
	}
}

func uploadKifu(color, coordinate, hash string) {
	var s_color string
	switch color {
	case "black":
		s_color = "B"
	case "white":
		s_color = "W"
	}

	cmd := ";" + s_color + "[" + coordinate + "])"
	fmt.Printf("/assets/kifu/" + hash + ".sgf")
	f, err := os.Open("./assets/kifu/" + hash + ".sgf")
	if err != nil {
		fmt.Println(err)
	}
	defer f.Close()
	b, err := ioutil.ReadAll(f)
	if err != nil {
		fmt.Printf("Error2")
	}
	l := len(string(b))
	content := string(b)[0:l-1] + cmd
	file, err := os.Create("./assets/kifu/" + hash + ".sgf")
	if err != nil {
		fmt.Printf("err")
	} else {
		_, err := file.WriteString(content)
		if err != nil {
			fmt.Printf("err")
		}
	}
}

func CheckTurn(hash string, size int) string {
	f, err := os.Open("./assets/kifu/" + hash + ".sgf")
	if err != nil {
		fmt.Println(err)
	}
	defer f.Close()
	b, err := ioutil.ReadAll(f)
	if err != nil {
		fmt.Printf("Error2")
	}
	l := len(b)
	color := string(b[l-6])
	pos := UnTransCoordinate(string(b[l-4:l-2]), size, false)
	return color + "," + pos
}
