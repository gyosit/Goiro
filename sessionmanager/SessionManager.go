package SessionManager

import (
	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/sessions"
)

func Login(ctx *gin.Context, username string) {
	session := sessions.Default(ctx)
	session.Set("alive", true)
	session.Set("username", username)
	session.Save()
}

func Logout(ctx *gin.Context) {
	session := sessions.Default(ctx)
	session.Clear()
	session.Save()
}

func GetUser(ctx *gin.Context) string{
	session := sessions.Default(ctx)
	username := session.Get("username")
	if username==nil{
		username = ""
	}
	return username.(string)
}