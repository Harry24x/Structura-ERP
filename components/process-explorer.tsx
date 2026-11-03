"use client";
import {useEffect,useRef,createElement} from 'react';
type Props={process:any,locale:string,editable:boolean,onSave:(next:any,expectedVersion:number)=>void,onNodeSelect:(id:string)=>void};
export function ProcessExplorer(props:Props){
 const element=useRef<any>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{let active=true;import('../public/quality/process-explorer.mjs').then(()=>{if(active)element.current?.configure({...latest.current,onSave:(next:any,version:number)=>latest.current.onSave(next,version),onNodeSelect:(id:string)=>latest.current.onNodeSelect(id)});});return()=>{active=false;};},[]);
 useEffect(()=>{element.current?.configure?.({...props,onSave:(next:any,version:number)=>latest.current.onSave(next,version),onNodeSelect:(id:string)=>latest.current.onNodeSelect(id)});},[props.process,props.locale,props.editable]);
 return createElement('process-explorer',{ref:element});
}
