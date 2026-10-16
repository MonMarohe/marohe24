'use strict';
class BlockBunny {
 constructor(random=Math.random){this.random=random;this.reset()}
 static shapes=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]]];
 reset(){this.board=Array.from({length:20},()=>Array(10).fill(0));this.score=0;this.lines=0;this.level=1;this.state='ready';this.bag=[];this.elapsed=0;this.active=null;this.next=this.pick();this.spawn()}
 pick(){if(!this.bag.length){this.bag=[0,1,2,3,4,5,6];for(let i=6;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]]}}return this.bag.pop()}
 spawn(){const kind=this.next;this.next=this.pick();const shape=BlockBunny.shapes[kind].map(r=>r.slice());this.active={shape,x:Math.floor((10-shape[0].length)/2),y:0,kind};if(this.collides(this.active))this.state='over'}
 collides(piece){return piece.shape.some((row,y)=>row.some((v,x)=>v&&(piece.x+x<0||piece.x+x>=10||piece.y+y>=20||piece.y+y<0||this.board[piece.y+y][piece.x+x])))}
 start(){if(this.state==='over')this.reset();this.state='playing'}
 pause(){if(this.state==='playing')this.state='paused'}
 resume(){if(this.state==='paused')this.state='playing'}
 move(dx){if(this.state!=='playing')return false;const candidate={...this.active,x:this.active.x+dx};if(this.collides(candidate))return false;this.active=candidate;return true}
 rotate(){if(this.state!=='playing')return false;const old=this.active.shape,shape=old[0].map((_,i)=>old.map(row=>row[i]).reverse());for(const dx of [0,-1,1,-2,2,-3,3]){const candidate={...this.active,shape,x:this.active.x+dx};if(!this.collides(candidate)){this.active=candidate;return true}}return false}
 drop(soft=false){if(this.state!=='playing')return false;const candidate={...this.active,y:this.active.y+1};if(!this.collides(candidate)){this.active=candidate;if(soft)this.score++;return true}this.lock();return false}
 hardDrop(){if(this.state!=='playing')return;let distance=0;while(!this.collides({...this.active,y:this.active.y+1})){this.active.y++;distance++}this.score+=distance*2;this.lock()}
 lock(){for(let y=0;y<this.active.shape.length;y++)for(let x=0;x<this.active.shape[y].length;x++)if(this.active.shape[y][x])this.board[this.active.y+y][this.active.x+x]=this.active.kind+1;const removed=this.board.filter(row=>row.every(Boolean)).length;this.board=this.board.filter(row=>!row.every(Boolean));while(this.board.length<20)this.board.unshift(Array(10).fill(0));this.score+=[0,100,300,500,800][removed]*this.level;this.lines+=removed;this.level=1+Math.floor(this.lines/10);this.elapsed=0;this.spawn()}
 update(dt){if(this.state!=='playing')return;this.elapsed+=Math.max(0,Math.min(dt,.1));const speed=Math.max(.12,.78-(this.level-1)*.065);if(this.elapsed>=speed){this.elapsed=0;this.drop()}}
 ghost(){const p={...this.active};while(!this.collides({...p,y:p.y+1}))p.y++;return p}
}
class BobaBunny {
 constructor(random=Math.random){this.random=random;this.level=1;this.reset()}
 reset(level=this.level){this.level=level;this.moves=25;this.score=0;this.target=1200+(level-1)*300;this.state='ready';this.lastCombo=0;this.board=this.generate();this.ensureMove()}
 randomType(){return Math.min(4,Math.floor(this.random()*5))}
 generate(){const b=Array.from({length:8},()=>Array(8).fill(0));for(let y=0;y<8;y++)for(let x=0;x<8;x++){const options=[0,1,2,3,4].filter(v=>!(x>1&&b[y][x-1]===v&&b[y][x-2]===v)&&!(y>1&&b[y-1][x]===v&&b[y-2][x]===v));b[y][x]=options[Math.min(options.length-1,Math.floor(this.random()*options.length))]}return b}
 matches(){const found=new Set();for(let y=0;y<8;y++)for(let x=0;x<8;x++){const v=this.board[y][x];if(v===null)continue;if(x<6&&this.board[y][x+1]===v&&this.board[y][x+2]===v){let n=x;while(n<8&&this.board[y][n]===v)found.add(y*8+n++)}if(y<6&&this.board[y+1][x]===v&&this.board[y+2][x]===v){let n=y;while(n<8&&this.board[n][x]===v)found.add(n++*8+x)}}return [...found]}
 exchange(a,b){const ay=Math.floor(a/8),ax=a%8,by=Math.floor(b/8),bx=b%8;[this.board[ay][ax],this.board[by][bx]]=[this.board[by][bx],this.board[ay][ax]]}
 hint(){for(let a=0;a<64;a++)for(const b of [a%8<7?a+1:-1,a<56?a+8:-1]){if(b<0)continue;this.exchange(a,b);const exists=this.matches().length>0;this.exchange(a,b);if(exists)return[a,b]}return null}
 ensureMove(){for(let n=0;n<60&&!this.hint();n++)this.board=this.generate();if(!this.hint()){this.board=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>(x+2*y)%5));this.board[0][0]=0;this.board[0][1]=1;this.board[0][2]=0;this.board[1][1]=0}}
 start(){if(this.state==='lost')this.reset();if(this.state==='won')this.reset(this.level+1);this.state='playing'}
 pause(){if(this.state==='playing')this.state='paused'}
 resume(){if(this.state==='paused')this.state='playing'}
 snapshot(){return this.board.map(row=>row.slice())}
 collapse(){const movements=[];for(let x=0;x<8;x++){const survivors=[];for(let y=0;y<8;y++)if(this.board[y][x]!==null)survivors.push({type:this.board[y][x],row:y});const missing=8-survivors.length;for(let y=0;y<8;y++){const entry=y<missing?{type:this.randomType(),row:y-missing}:survivors[y-missing];this.board[y][x]=entry.type;movements.push({from:entry.row*8+x,to:y*8+x,type:entry.type,isNew:y<missing})}}return movements}
 swap(a,b){if(this.state!=='playing'||!Number.isInteger(a)||!Number.isInteger(b)||a<0||a>63||b<0||b>63)return{valid:false};if(Math.abs(Math.floor(a/8)-Math.floor(b/8))+Math.abs(a%8-b%8)!==1)return{valid:false};this.exchange(a,b);if(!this.matches().length){this.exchange(a,b);return{valid:false}}this.moves--;const swappedBoard=this.snapshot(),steps=[];let combo=0,cleared=0;for(;combo<25;){const matches=this.matches();if(!matches.length)break;combo++;cleared+=matches.length;const before=this.snapshot();this.score+=matches.length*30*combo;for(const pos of matches)this.board[Math.floor(pos/8)][pos%8]=null;const holes=this.snapshot(),movements=this.collapse();steps.push({before,holes,after:this.snapshot(),matches,movements,combo,score:this.score})}if(this.matches().length)this.board=this.generate();this.lastCombo=combo;const settled=JSON.stringify(this.board);this.ensureMove();const shuffled=settled!==JSON.stringify(this.board)||JSON.stringify(steps.at(-1)?.after)!==JSON.stringify(this.board);if(this.score>=this.target)this.state='won';else if(this.moves<=0)this.state='lost';return{valid:true,combo,cleared,swappedBoard,steps,finalBoard:this.snapshot(),shuffled}}
}
if(typeof module!=='undefined'&&module.exports)module.exports={BlockBunny,BobaBunny};
