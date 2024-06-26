import { flavors } from "@catppuccin/palette";
import kaboom, { Color, Key } from "kaboom";
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

let noteSpeed = 1 // s
let noteTravelDist = 800
let bgTranspart = 0.6

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

const keyOrder = [
	"  1234",
	"56zxcv",
	"asdfgh",
	"qwerty",
	"uiop[]",
	"jkl;'\\",
	"7890-=",
	"n,./  ",
] as const

function keyToLetter(notePitch: number){
	const clampedNote = k.clamp(notePitch, 16, 105) - 12
	const octave = Math.floor( clampedNote / 12)
	const note = Math.floor((clampedNote % 12) / 2)

	return keyOrder[octave][note] as Key
}
function keyToColor(notePitch: number){
	const clampedNote = k.clamp(notePitch, 16, 105) - 12
	const octave = Math.floor( clampedNote / 12)

	return [
		colors.mauve,
		colors.mauve,
		colors.red,
		colors.yellow,
		colors.green,
		colors.sky,
		colors.blue,
		colors.blue,
	][octave]
}

k.scene("game", async (songFile: string)=>{
	initScene()
	let currentHeight = 0

	const judgementText = k.add([
		k.text(""),
		k.pos(0, -80),
		k.color(),
		k.anchor("top")
	])
	let combo = 0
	const comboText =  judgementText.add([
		k.text("", {size : 20}),
		k.pos(0, -5),
		k.color(),
		k.anchor("bot")
	])
	function registerJudgement(judgement: "good" | "perfect" | "miss"){
		judgementText.text = judgement
		switch (judgement){
			case "good": judgementText.color = colors.green; break;
			case "perfect": judgementText.color = colors.sapphire; break;
			case "miss": judgementText.color = colors.overlay0
		}
		if (judgement != "miss") combo ++
		else combo = 0

		comboText.text = combo.toString()
	}

	const player = new midi.Player(async (event: midi.Event)=>{

		if (event.name !== "Note on") return
		const spawnTime = k.time()

		const note = k.add([
			k.opacity(bgTranspart),
			k.circle(35),
			k.pos( 600, currentHeight * 70 ),
			k.color(keyToColor(event.noteNumber ?? 0)),
			k.move(k.LEFT, noteTravelDist / noteSpeed),
			k.lifespan(noteSpeed - judgementWindow.good , { fade: 0.1 })
		])

		note.add([
			k.text(keyToLetter(event.noteNumber ?? 0)),
			k.anchor("center"),
			k.color(colors.text),
			k.opacity(1),
			{
				update(){
					(this as any).opacity = note.opacity * (1/bgTranspart)
				}
			}
		])

		if (currentHeight === 0) k.wait((noteSpeed / noteTravelDist) * 90, ()=> currentHeight = 0)
		currentHeight += 1 // a black note after a white one could cause issues ( A# after A for example )

		await k.wait(noteSpeed)
		let time = await waitForInput(judgementWindow.good * 2, keyToLetter(event.noteNumber ?? 0)) // TODO
		if (time < judgementWindow.good) time = judgementWindow.good - time
		else time -= judgementWindow.good

		if (time < judgementWindow.perfect) return registerJudgement("perfect")
		if (time < judgementWindow.good) return registerJudgement("good")
		return registerJudgement("miss")
	})

	const buffer = await fetch(songFile).then(res=>res.arrayBuffer())
	player.loadArrayBuffer(buffer)
	player.play()

})

k.scene("songSelect", ()=>{})
k.scene("settings", ()=>{})

k.go("game", "Untitled.mid")
