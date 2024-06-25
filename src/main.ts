import { flavors } from "@catppuccin/palette";
import kaboom, { Key } from "kaboom";
import * as midi from "midi-player-js";

const k = kaboom({
	width: 1000,
	scale: innerWidth / 1000,
})

const colors = Object.fromEntries(Object.entries(flavors.macchiato.colors).map(([name, color])=> [name, k.rgb(color.hex)]))

type JudgementWindows = {
	perfect: number, // in ms
	good: number,
}

let noteSpeed = 0.5 // s
let noteTravelDist = 800

let judgementWindow: JudgementWindows = {
	perfect: 0.05,
	good: 0.15,
}

function initScene(){
	k.camPos(0,0)
  	k.onResize(()=>k.camScale(innerWidth/1000,innerWidth/1000))
	k.setBackground(colors.base)
}

const waitForInput = (timeout:number, chacracter: Key)=>new Promise<number>(async (res, fail)=>{
	const startTime = k.time()
	const collector = k.onKeyPress(chacracter, ()=>res(k.time() - startTime))

	await k.wait(timeout)
	collector.cancel()
	res(999999)
})

k.scene("game", async (songFile: string)=>{
	initScene()
	let currentHeight = 0

	const judgementText = k.add([
		k.text("good"),
		k.pos(0, -80),
		k.anchor("top")
	])
	const comboText =  judgementText.add([
		k.text("x52", {size : 20}),
		k.pos(0, -5),
		k.anchor("bot")
	])
	function registerJudgement(judgement: "good" | "perfect" | "miss"){

	}

	const player = new midi.Player(async (event: midi.Event)=>{

		if (event.name !== "Note on") return
		const spawnTime = k.time()

		const note = k.add([
			k.opacity(1),
			k.circle(35),
			k.pos( 600, currentHeight * 70 ),
			k.color(colors.overlay1),
			k.move(k.LEFT, noteTravelDist / noteSpeed),
			k.lifespan(noteSpeed - judgementWindow.good , { fade: 0.1 })
		])

		note.add([
			k.text(event.noteName ?? "??"),
			k.anchor("center"),
			k.color(colors.text),
			k.opacity(1),
			{
				update(){
					(this as any).opacity = note.opacity
				}
			}
		])

		if (currentHeight === 0) k.wait((noteSpeed / noteTravelDist) * 90, ()=> currentHeight = 0)
		currentHeight += 1 // a black note after a white one could cause issues ( A# after A for example )

		await k.wait(noteSpeed)
		let time = await waitForInput(judgementWindow.good * 2, "1") // TODO
		if (time < judgementWindow.good) time = judgementWindow.good - time
		else time -= judgementWindow.good

		if (time < judgementWindow.perfect) return console.log("perfect")
		if (time < judgementWindow.good) return console.log("good")
		return console.log("miss")
	})

	const buffer = await fetch(songFile).then(res=>res.arrayBuffer())
	player.loadArrayBuffer(buffer)
	player.play()

})

k.scene("songSelect", ()=>{})
k.scene("settings", ()=>{})

k.go("game", "badApple.mid")
