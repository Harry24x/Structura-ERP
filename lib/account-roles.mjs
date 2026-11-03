// Account assignments use the verified identity supplied by Sites. They name
// the owner's work role; document ownership and recipient grants authorize data.
const consultantEmails=new Set(['sandertammela@gmail.com','jana.raudvere@gmail.com']);
export function accountRole(user){return consultantEmails.has(String(user?.email||'').trim().toLowerCase())?'consultant':'manager';}
