import {shortestPath} from './rubik-core.js';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,...shortestPath(data.state)});}catch(e){self.postMessage({id:data.id,error:String(e)});}};
