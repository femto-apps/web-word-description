const jetpack = require('fs-jetpack')

const lines = jetpack.read('./data/raw_words.txt').split('\r\n')

let cards = []

for (let line of lines) {
    if (line === '') {
        cards.push([])
    } else {
        cards[cards.length - 1].push(line)
    }
}

cards = cards.map((card, index) => ({
    id: index + 1,
    person: card[0],
    world: card[1],
    object: card[2],
    action: card[3],
    nature: card[4],
    random: card[5]
}))

jetpack.write('./data/cards.json', cards)