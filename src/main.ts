import { flavorEntries, flavors } from "@catppuccin/palette";
import kaboom, { Color } from "kaboom";
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

	const player = new Player(event=>{
		if (event.event !== "noteOn") return

		const note = k.add([
			k.circle(100),
			k.pos(1100, 0),
			k.color(), // TODO
			k.move(k.LEFT, (1000 - judgementLinePadding)/noteSpeed)
		])

		note.add([
			k.text(event.note),
			k.anchor("center"),
			k.pos(50,50),
			k.color(colors.text)
		])

		k.onKeyPress(key=>{}) // TODO
	})

	k.onKeyPress(()=>k.add([
		k.rect()
	]))

	player.loadFile(song)
	player.play()

})

k.scene("songSelect", ()=>{})
k.scene("settings", ()=>{})