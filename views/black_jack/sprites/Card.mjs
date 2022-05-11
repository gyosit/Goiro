const MARK_NUM = 4;
const NUMBER_NUM = 13;
export class Card {
    constructor(mark, num) {
        this.mark = mark;
        this.num = num;
    }
}
export class Cards {
    constructor(cards) {
        this.cards = cards;
    }
    sortCards() {
        this.cards = this.cards.sort((obj1, obj2) => {
            if (obj1.mark > obj2.mark) {
                return 1;
            }
            else if (obj1.mark < obj2.mark) {
                return -1;
            }
            else {
                if (obj1.num > obj2.num) {
                    return 1;
                }
                else if (obj1.num < obj2.num) {
                    return -1;
                }
            }
            return 0;
        });
    }
    makeFullDeck() {
        this.cards = [];
        for (let i = 1; i <= MARK_NUM; i++) {
            for (let j = 1; j <= NUMBER_NUM; j++) {
                this.cards.push(new Card(i, j));
            }
        }
    }
    shuffle() {
        for (let i = 0; i < this.cards.length; i++) {
            let j = Math.floor(Math.random() * (i + 1));
            let tmp_card = this.cards[i];
            this.cards[i] = this.cards[j];
            this.cards[j] = tmp_card;
        }
    }
    reset() {
        this.cards = [];
    }
    giveTo(another_cards, num) {
        for (let i = 0; i < num; i++) {
            if (this.cards.length > 0) {
                let tmp_card = this.cards.pop();
                another_cards.cards.push(tmp_card);
            }
        }
    }
    countCards() {
        return this.cards.length;
    }
    getSum() {
        return this.cards.reduce((sum, element) => sum + element.num, 0);
    }
    getSum_bj() {
        let sum = 0;
        let one_count = 0;
        this.cards.forEach(card => {
            if (card.num == 1)
                one_count++;
            else if (card.num < 11)
                sum += card.num;
            else
                sum += 10;
        });
        for (let i = 0; i < one_count; i++) {
            sum++;
        }
        return sum;
    }
}
