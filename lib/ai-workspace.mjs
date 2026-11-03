// Compare the captured inputs with the live workspace before applying async output.
export function matchesAIRequest(snapshot,current) {
 return snapshot.version===current.process.version&&snapshot.source===current.source&&
  (snapshot.locale||'en')===(current.locale||'en')&&
  JSON.stringify(snapshot.process)===JSON.stringify(current.process)&&
  (snapshot.intent!=='edit'||snapshot.command===current.command)&&
  (snapshot.intent!=='clarify'||snapshot.answer===current.answers?.[snapshot.questionId]);
}
