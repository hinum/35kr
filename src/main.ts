import { flavors } from "@catppuccin/palette";
import kaboom from "kaboom";
import * as midi from "midi-player-js";

const k = kaboom({
	width: 1000,
	scale: innerWidth / 1000,
})

const colors = Object.fromEntries(Object.entries(flavors.macchiato.colors).map(([name, color])=> [name, k.rgb(color.hex)]))

type Judgements = {
	great: number, // in ms
	good: number,
	ok: number
}

let noteSpeed = 0.5 // s
let judgementLinePadding = 100
let judgements: Judgements = {
	great: 10,
	good: 20,
	ok: 40
}

k.scene("game", async (songFile: string)=>{
	k.camPos(0,0)
	k.setBackground(colors.base)
	let currentHeight = 0

	const player = new midi.Player((event: midi.Event)=>{
		if (event.name !== "Note on") return

		console.log(event.noteName)

		const note = k.add([
			k.circle(35),
			k.pos(600, currentHeight * 70),
			k.color(colors.overlay1), // TODO
			k.move(k.LEFT, (1000 - judgementLinePadding)/noteSpeed),
			k.lifespan(noteSpeed, )
		])

		note.add([
			k.text(event.noteName ?? "??"),
			k.anchor("center"),
			k.color(colors.text)
		])

    	currentHeight += 1
    	k.wait(70 / (1100 / noteSpeed), ()=> currentHeight -= 1)
	})

	k.onKeyPress(()=>{
		k.add([
			k.pos(judgementLinePadding - 500,0),
			k.anchor("center"),
			k.rect(100, (judgements.good / noteSpeed) * 1100 * 2),
			k.opacity(0),
			k.fadeIn(0.2),
			k.lifespan(0.1, {fade: 0.1})
		])
	})

	const buffer = await fetch(songFile).then(res=>res.arrayBuffer())
	player.loadArrayBuffer(buffer)
	player.play()

})

k.scene("songSelect", ()=>{})
k.scene("settings", ()=>{})

k.go("game", "badApple.mid")