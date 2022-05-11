const MARK_NUM: number = 4
const NUMBER_NUM: number = 13

export class Card {
    mark: number
    num: number

    constructor(mark: number, num: number){
        this.mark = mark
        this.num = num
    }
}

export class Cards {
    cards: Card[]

    constructor(cards: Card[]) {
        this.cards = cards
    }

    sortCards(): void{
        this.cards = this.cards.sort((obj1, obj2) => {
            if(obj1.mark > obj2.mark) {
                return 1
            }else if(obj1.mark < obj2.mark) {
                return -1
            }else{
                if(obj1.num > obj2.num){
                    return 1
                }else if(obj1.num < obj2.num){
                    return -1
                }
            }
    
            return 0
        })
    }

    makeFullDeck(): void{
        this.cards = []
        for(let i:number = 1; i<=MARK_NUM; i++) {
            for(let j:number = 1; j<=NUMBER_NUM; j++) {
                this.cards.push(new Card(i, j))
            }
        }
    }

    shuffle(): void{
        for(let i:number = 0; i<this.cards.length; i++) {
            let j: number = Math.floor(Math.random() * (i + 1))
            let tmp_card: Card = this.cards[i]
            this.cards[i] = this.cards[j]
            this.cards[j] = tmp_card
        }
    }

    reset(): void{
        this.cards = []
    }

    giveTo(another_cards: Cards, num: number) {
        for(let i:number = 0; i<num; i++) {
            if(this.cards.length > 0){
                let tmp_card: Card = this.cards.pop()!
                another_cards.cards.push(tmp_card)
            }
        }
    }

    countCards(): number {
        return this.cards.length
    }

    getSum(): number {
        return this.cards.reduce((sum, element) => sum + element.num, 0)
    }

    getSum_bj(): number {
        let sum = 0
        let one_count = 0
        this.cards.forEach(card => {
            if(card.num == 1) one_count++
            else if(card.num < 11) sum += card.num
            else sum += 10
        })
        for(let i=0; i < one_count; i++){
            sum++
        }
        
        return sum
    }
    
}