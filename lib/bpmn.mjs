import {systemColor, taskCard} from './systems.mjs';
import {isResponsibilityConflict} from './i18n.mjs';

const laneHeader = 152;
const columnWidth = 224;
const rowHeight = 108;
const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'}[char]));

function wrap(value, width) {
  const words = value.trim().split(/\s+/).flatMap(word =>
    Array.from({length: Math.ceil(word.length / width)}, (_, i) => word.slice(i * width, (i + 1) * width)));
  const lines = [];
  for (const word of words) {
    const last = lines.at(-1);
    if (last && last.length + word.length < width) lines[lines.length - 1] += ' ' + word;
    else lines.push(word);
  }
  return lines.length > 3 ? [...lines.slice(0, 2), lines[2] + '…'] : lines;
}

function label(value, x, y, {width = 22, anchor = 'middle', size = 12, color = '#263640'} = {}) {
  return wrap(value, width).map((line, i) =>
    `<text x="${x}" y="${y + i * 14}" text-anchor="${anchor}" font-size="${size}" fill="${color}">${escape(line)}</text>`).join('');
}

export function roleLaneLayout(process, ranked, unknownRoleLabel) {
  const byId = new Map(process.nodes.map(node => [node.id, node]));
  const roleIds = new Set(process.roles.map(role => role.id));
  const slots = new Map();
  for (const node of ranked.nodes) {
    let role = node.roleId ?? null;
    if (role === null && (node.type === 'start' || node.type === 'end')) {
      const adjacent = process.edges.flatMap(edge =>
        node.type === 'start' && edge.from === node.id ? [edge.to] :
        node.type === 'end' && edge.to === node.id ? [edge.from] : []);
      const roles = new Set(adjacent.map(id => byId.get(id)?.roleId ?? null));
      if (roles.size === 1) role = [...roles][0];
    }
    if (!roleIds.has(role)) role = null;
    const rank = Math.round((node.x - 166) / 320);
    if (!slots.has(role)) slots.set(role, new Map());
    const columns = slots.get(role);
    if (!columns.has(rank)) columns.set(rank, []);
    columns.get(rank).push(node);
  }
  const lanes = [];
  const nodes = new Map();
  let top = 70;
  let maxRank = 0;
  for (const role of [...process.roles, {id:null, label:unknownRoleLabel}]) {
    const columns = slots.get(role.id);
    if (!columns) continue;
    const height = Math.max(...Array.from(columns.values(), column => column.length)) * rowHeight + 40;
    const lane = {...role, top, height};
    lanes.push(lane);
    for (const [rank, column] of columns) {
      maxRank = Math.max(maxRank, rank);
      column.forEach((node, index) => nodes.set(node.id, {
        ...node, rank, lane, x:laneHeader + columnWidth * (rank + .5),
        y:top + 60 + index * rowHeight,
        halfWidth:node.type === 'activity' ? 74 : node.type === 'decision' ? 57 : 14,
      }));
    }
    top += height;
  }
  return {lanes,nodes,width:laneHeader + (maxRank + 1) * columnWidth + 36,height:top + 58,back:ranked.back};
}

export function renderRoleLanes(process, layout, highlighted, copy) {
  const {lanes, nodes, width, height, back} = layout;
  const systems = new Map((process.systems || []).map(system => [system.id, system]));
  const questions = new Set((process.questions || []).flatMap(question => question.nodeIds || []));
  const conflicts = new Map((process.questions || []).filter(isResponsibilityConflict)
    .flatMap(question => question.nodeIds.map(id => [id,question.text])));
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" font-family="Arial,sans-serif" role="img" aria-label="${escape(process.title)}" data-process-svg="true"><title>${escape(process.title)}</title><defs><marker id="bpmn-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#56636e"/></marker><marker id="bpmn-return" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#aa5d20"/></marker></defs><rect width="${width}" height="${height}" fill="white"/><text x="16" y="27" font-size="19" font-weight="600" fill="#263640">${escape(process.title)}</text><text x="16" y="49" font-size="11" fill="#52616b">BPMN · ${escape(process.mode.toUpperCase())}</text>`];
  for (const [index, lane] of lanes.entries()) {
    const unknown = lane.id === null;
    const stroke = unknown ? '#b47640' : '#d3dbe1';
    parts.push(`<rect x="1" y="${lane.top}" width="${width-2}" height="${lane.height}" fill="${index%2?'#fff':'#f4f6f8'}" stroke="${stroke}" ${unknown?'stroke-dasharray="6 4"':''}/><path d="M${laneHeader} ${lane.top}v${lane.height}" stroke="${stroke}"/>`);
    parts.push(label(lane.label, laneHeader/2, lane.top+lane.height/2-5, {width:19,color:unknown?'#98531e':'#263640'}));
  }
  for (const [index, edge] of process.edges.entries()) {
    const a = nodes.get(edge.from), b = nodes.get(edge.to);
    const loop = back.has(index);
    const start = a.x + a.halfWidth, end = b.x - b.halfWidth;
    const offset = (index % 4) * 4;
    const direct = !loop && b.rank === a.rank+1;
    const mid = (start+end)/2 + offset;
    const gutter = loop ? a.lane.top + a.lane.height - 13 - offset : a.lane.top + 13 + offset;
    const path = direct
      ? `M${start} ${a.y}H${mid}V${b.y}H${end}`
      : `M${start} ${a.y}H${a.x+84+offset}V${gutter}H${b.x-84-offset}V${b.y}H${end}`;
    parts.push(`<path d="${path}" fill="none" stroke="${loop?'#aa5d20':'#56636e'}" stroke-width="1.35" ${loop?'stroke-dasharray="6 4"':''} marker-end="url(#bpmn-${loop?'return':'arrow'})"/>`);
    if (edge.label) {
      const text = edge.label.length > 44 ? edge.label.slice(0, 43)+'…' : edge.label;
      const x = direct ? mid : (a.x+b.x)/2;
      const y = direct ? b.y-7 : gutter-5;
      parts.push(`<text x="${x}" y="${y}" text-anchor="middle" font-size="10" paint-order="stroke" stroke="white" stroke-width="3" fill="${loop?'#995221':'#42525c'}">${escape(text)}</text>`);
    }
  }
  for (const node of nodes.values()) {
    const {x,y} = node;
    const card = taskCard(node);
    const system = systems.get(card.systemId);
    const terminal = node.type === 'start' || node.type === 'end';
    const systemLabel = system?.label || (card.execution==='manual' ? copy.manualSystemLabel : copy.unknownSystemLabel);
    const execution = copy.executionLabels[card.execution];
    const conflict = conflicts.get(node.id);
    const tooltip = [node.label, conflict, terminal?'':systemLabel, terminal?'':execution, node.evidence, card.systemEvidence].filter(Boolean).join(' · ');
    const stroke = highlighted.includes(node.id) ? '#318060' : '#56636e';
    const unresolved = questions.has(node.id);
    parts.push(`<g data-node="${escape(node.id)}" tabindex="0" role="button" aria-label="${escape(node.label)}" style="cursor:pointer"><title>${escape(tooltip)}</title>`);
    if (terminal) {
      const end = node.type==='end';
      parts.push(`<circle cx="${x}" cy="${y}" r="14" fill="${end?'#fff1f2':'#e7f6ed'}" stroke="${end?'#af303a':'#267445'}" stroke-width="${end?3:2}"/>`);
      parts.push(label(node.label,x,y+30));
    } else if (node.type==='decision') {
      parts.push(`<path d="M${x-57} ${y}L${x} ${y-34}L${x+57} ${y}L${x} ${y+34}Z" fill="#fff3ca" stroke="${unresolved?'#b47640':'#987122'}" stroke-width="1.6" ${unresolved?'stroke-dasharray="5 3"':''}/><path d="M${x-4} ${y-21}l8 8m0-8l-8 8" stroke="#765716" fill="none"/>`);
      parts.push(label(node.label,x,y+2,{width:15,size:10}));
    } else {
      const color = system ? systemColor(system.id) : '#65737c';
      const badge = systemLabel.length > 17 ? systemLabel.slice(0,16)+'…' : systemLabel;
      const mode = {manual:'M',assisted:'H',automated:'A',unknown:'?'}[card.execution];
      parts.push(`<rect x="${x-74}" y="${y-40}" width="148" height="80" rx="7" fill="white" stroke="${unresolved?'#b47640':stroke}" stroke-width="1.5" ${unresolved?'stroke-dasharray="5 3"':''}/><rect x="${x-68}" y="${y-34}" width="111" height="16" rx="3" fill="${color}"/><text x="${x-63}" y="${y-23}" font-size="9" font-weight="600" fill="white">${escape(badge)}</text><circle cx="${x+58}" cy="${y-26}" r="8" fill="white" stroke="#65737c"/><text x="${x+58}" y="${y-23}" text-anchor="middle" font-size="9" fill="#263640">${mode}</text>`);
      parts.push(label(node.label,x,y-2,{width:22,size:11}));
    }
    if (conflict) parts.push(label(conflict.split(':')[0],x,y+54,{width:28,size:10,color:'#98531e'}));
    parts.push('</g>');
  }
  const legend = [copy.startLabel,copy.activityLabel,copy.decisionLabel,copy.endLabel,
    'M  '+copy.executionLabels.manual,'H  '+copy.executionLabels.assisted,
    'A  '+copy.executionLabels.automated,'?  '+copy.executionLabels.unknown,
    copy.loopLabel,copy.clarificationLabel];
  const symbols = ['●','▭','◇','●','','','','','⇢','⋯'];
  const colors = ['#267445','#56636e','#987122','#af303a','#56636e','#56636e','#56636e','#56636e','#aa5d20','#b47640'];
  const legendTop = height-38;
  let left = 16, line = 0;
  for (const [index, item] of legend.entries()) {
    const span = (item.length+4)*6+14;
    if (left+span > width && left>16) { left=16; line++; }
    parts.push(`<text x="${left}" y="${legendTop+line*16}" font-size="10" fill="${colors[index]}">${escape([symbols[index],item].filter(Boolean).join(' '))}</text>`);
    left += span;
  }
  return parts.join('')+'</svg>';
}
