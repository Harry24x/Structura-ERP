export const DIRECTION_STORE = 'team5-process-studio-direction';
export const DIAGRAM_DIRECTIONS = Object.freeze([
 {id:'LR',label:'Left to right'},
 {id:'TD',label:'Top to bottom'}
]);
export const normalizeDirection = value => DIAGRAM_DIRECTIONS.some(d=>d.id===value)?value:'LR';
