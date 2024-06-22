import { flavors } from "@catppuccin/palette";
import kaboom from "kaboom";
import { Player } from "midi-player-js"

const k = kaboom({
	scale: innerWidth / 1000,
})

const colors = Object.fromEntries(Object.entries(flavors.macchiato.colors).map(([name, color])=> [name, k.rgb(color.hex)]))

type Judgements = {
	great: number, // in ms
	good: number,
	ok: number
}

let noteSpeed = 250 // ms
let judgementLinePadding = 100
let judgements: Judgements = {
	great: 10,
	good: 20,
	ok: 40
}

k.scene("game", (song: string)=>{
	k.camPos(0,0)
	k.setBackground(colors.base)
  let currentHeight = 0

	const player = new Player((event: any)=>{ //TODO: create event type
		if (event.event !== "noteOn") return

    currentHeight += 1

		const note = k.add([
			k.circle(50),
			k.pos(1100, currentHeight * 120),
			k.color(colors.overlay1), // TODO
			k.move(k.LEFT, (1000 - judgementLinePadding)/noteSpeed)
		])

		note.add([
			k.text(event.noteName),
			k.anchor("center"),
			k.pos(50,50),
			k.color(colors.text)
		])

    k.wait(70 / (1100 / noteSpeed), ()=> currentHeight -= 1)
	})

	k.onKeyPress(()=>{
    k.add([
      k.pos(0,0),
      k.anchor("bot"),
      k.rect((judgements.good / noteSpeed) * 1100 * 2, 100),
      k.opacity(0),
      k.fadeIn(0.2),
      k.lifespan(0.4, {fade: 0.2})
    ])
  })

	player.loadFile(song)
	player.play()

})

k.scene("songSelect", ()=>{})
k.scene("settings", ()=>{})
