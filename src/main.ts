import { flavors } from "@catppuccin/palette";
import kaboom from "kaboom";
import * as midi from "midi-player-js";

const k = kaboom({
	width: 1000,
	scale: innerWidth / 1000,
})

const colors = Object.fromEntries(Object.entries(flavors.macchiato.colors).map(([name, color])=> [name, k.rgb(color.hex)]))

type Judgements = {
	perfect: number, // in ms
	good: number,
}

let noteSpeed = 0.5 // s
let notePaddingDist = 10
let noteTravelDist = 600
let startHiddingDist = 100
let judgements: Judgements = {
	perfect: 0.1,
	good: 0.3,
}

function initScene(){
	k.camPos(0,0)
  k.onResize(()=>k.camScale(innerWidth/1000,innerWidth/1000))
	k.setBackground(colors.base)
}

k.scene("game", async (songFile: string)=>{
  initScene()
  const inputHandles: (()=>boolean)[] = []
	let currentHeight = 0

	const player = new midi.Player((event: midi.Event)=>{
		if (event.name !== "Note on") return
    const spawnTime = k.time()

		const note = k.add([
			k.circle(35),
			k.pos(600, currentHeight * 70),
			k.color(colors.overlay1),
			k.move(k.LEFT, noteTravelDist / noteSpeed),
			k.lifespan(noteSpeed, { fade: (noteSpeed / noteTravelDist) *  startHiddingDist})
		])

		note.add([
			k.text(event.noteName ?? "??"),
			k.anchor("center"),
			k.color(colors.text)
		])

    currentHeight += 1 // a black note after a white one could cause issues ( A# after A for example )
    k.wait((noteSpeed / noteTravelDist) * notePaddingDist, ()=> currentHeight -= 1)
    k.wait(noteSpeed, ()=>inputHandles.push(()=>{
    }))
	})

	k.onKeyPress(()=>{
		k.add([
			k.pos( -300 ,0),
			k.anchor("center"),
			k.rect(100, (noteTravelDist / noteSpeed) * judgements.good * 2),
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
