<template>
    <div class="GameStage">
        <a href="#" @click="hit('player')">HIT</a> <a href="#" @click="stand">STAND</a> <a v-if="winner != ''" href="#" @click="newgame">NEW GAME</a><br>
        <span v-if="winner != ''">DEALER: {{ sum.dealer }}</span> <br>
        PLAYER: {{sum.player}} <br>
        <span v-if="winner == 'draw'" class="draw">Good Game! DRAW!</span>
        <span v-else-if="winner != ''" :class="{player_win:is_player_win, player_lose:is_player_lose}">Good Game! {{winner}} WIN!</span>
    </div>
</template>

<script>
import {DrawStage} from "../drawStage.mjs"
import {Card, Cards} from "../sprites/Card.mjs"
import {ref, watch, computed} from "vue"


export default{
    name: "GameStage",
    setup() {
        let drawStage = new DrawStage()

        let deck = new Cards([])

        const turn = ref("player")
        const hand = ref({
            dealer: new Cards([]),
            player: new Cards([])
        })

        const y = {dealer: 110, player: 200}

        let BLANK = new Card(0, 0)

        const initialize = () => {
            turn.value = "player"
            // 手札の初期化
            hand.value.dealer.reset()
            hand.value.player.reset()
            console.log(sum.value.player)

            // 山札の初期化
            deck.makeFullDeck()
            deck.shuffle()
            hit("player")
            hit("dealer")
            hit("player")
            hit("dealer")
            drawStage.drawCard(BLANK, 35*3, y["dealer"])
        }

        const hit = (person) => {
            if(turn.value == "end") return
            deck.giveTo(hand.value[person], 1)
            const count = hand.value[person].countCards()
            drawStage.drawCard(hand.value[person].cards[count-1], 35*(count+1), y[person])
        }

        const stand = () => {
            if(turn.value == "end") return
            if(turn.value == "player"){
                turn.value = "dealer"
                // 隠し札の公開
                drawStage.deleteCard(BLANK)
            }else
                turn.value = "end"
        }

        const newgame = () => {
            // キャンバスの初期化
            hand.value.dealer.cards.forEach(card => {
                drawStage.deleteCard(card)
            })
            hand.value.player.cards.forEach(card => {
                drawStage.deleteCard(card)
            })
            drawStage.deleteCard(BLANK)

            initialize()
        }

        watch(turn, (new_val, _) => {
            if(new_val == "dealer") dealerPlay()
        })

        const dealerPlay = () => {
            while(true){
                if(sum.value.dealer < 17){
                    hit("dealer")
                }else{
                    stand()
                    break
                }
            }
        }

        const sum = computed(() => {
            return {dealer: hand.value.dealer.getSum_bj(), player: hand.value.player.getSum_bj()}
        })

        const is_bust = computed(() => {
            return {dealer: sum.value.dealer > 21, player: sum.value.player > 21}
        })

        const winner = computed(() => {
            if(is_bust.value.dealer^is_bust.value.player){
                // どちらかがバーストしている
                turn.value = "end"
                if(is_bust.value.dealer == true) return "player"
                else if(is_bust.value.player == true) return "dealer"
            }else if(turn.value == "end"){
                // ゲームエンド時
                if(sum.value.dealer > sum.value.player) return "dealer"
                else if(sum.value.player > sum.value.dealer) return "player"
                else return "draw"
            }else{
                return ""
            }
        })

        const is_player_win = computed(() => {return (winner.value == "player")})
        const is_player_lose = computed(() => {return (winner.value == "dealer")})
        const is_player_draw = computed(() => {return (winner.value == "draw")})

        initialize()

        return {hit, sum, winner, stand, turn, newgame, is_player_win, is_player_lose, is_player_draw}
    }        
}
</script>

<style scoped>
a {
    background: rgba(255, 255, 255, 0.5);
    border: 2px solid;
    border-image: conic-gradient(#f5f551,#5eff5e,#84a1ff,#ff45ff,#ff5a5a,#ffbc41,#f5f551) 1;
    color: black;
}

a:hover {
  background-image: -webkit-gradient(
    linear,
    left top,
    right top,
    color-stop(40%, #ff3cac),
    to(#562b7c)
  );
  color: white;
}

span.player_win{
    color: red;
}

span.player_lose{
    color: blue;
}

span.player_draw{
    color: green;
}
</style>