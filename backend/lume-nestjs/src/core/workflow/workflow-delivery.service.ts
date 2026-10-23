import { Injectable } from '@nestjs/common';
import { resolve4 } from 'dns/promises';
import { request } from 'https';
import { isIP } from 'net';

export function publicIPv4(address: string): boolean {
  if(isIP(address)!==4)return false;
  const [a,b,c]=address.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||
    (a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===2))||
    (a===198&&(b===18||b===19||b===51&&c===100))||(a===203&&b===0&&c===113));
}

/** JSON delivery gateway contract; credentials are supplied by the operator, never by a workflow. */
@Injectable()
export class WorkflowDeliveryService {
  async deliver(payload: any, key: string) {
    let url:string, token:string|undefined;
    if(payload.channel==='webhook')url=payload.url;
    else if(payload.channel==='email'||payload.channel==='push'){
      url=process.env[payload.channel==='email'?'WORKFLOW_EMAIL_GATEWAY_URL':'WORKFLOW_PUSH_GATEWAY_URL'];
      token=process.env[payload.channel==='email'?'WORKFLOW_EMAIL_GATEWAY_TOKEN':'WORKFLOW_PUSH_GATEWAY_TOKEN'];
      if(!url||!token)throw new Error('Delivery gateway is not configured');
    }else throw new Error('Unsupported delivery channel');
    return this.post(url,payload.body,key,token);
  }

  async post(rawUrl: string, body: unknown, key: string, token?: string) {
    const url=new URL(rawUrl);
    const allowed=(process.env.WORKFLOW_DELIVERY_HOSTS||'').split(',').map(host=>host.trim().toLowerCase()).filter(Boolean);
    if(url.protocol!=='https:'||url.username||url.password||url.hash||(url.port&&url.port!=='443')||!allowed.includes(url.hostname.toLowerCase()))throw new Error('Delivery destination is not allowed');
    const addresses=isIP(url.hostname)?[url.hostname]:await resolve4(url.hostname);
    if(!addresses.length||addresses.some(address=>!publicIPv4(address)))throw new Error('Delivery destination must resolve to public IPv4 addresses');
    const bytes=Buffer.from(JSON.stringify(body));
    if(bytes.length>262144)throw new Error('Delivery payload too large');
    return new Promise<{status:number;accepted:boolean}>((resolve,reject)=>{
      // Pin the validated address while preserving TLS hostname verification.
      const req=request(url,{method:'POST',family:4,lookup:((_host:any,_options:any,callback:any)=>callback(null,addresses[0],4)) as any,
        headers:{'content-type':'application/json','content-length':bytes.length,'idempotency-key':key,...(token?{authorization:`Bearer ${token}`}:{})}},res=>{
        let size=0;
        res.on('data',chunk=>{size+=chunk.length;if(size>262144)req.destroy(new Error('Delivery response too large'));});
        res.on('error',()=>reject(new Error('Delivery response failed')));
        res.on('end',()=>{
          const status=res.statusCode||0;
          if(status<200||status>=300)return reject(new Error(`Delivery rejected with HTTP ${status}`));
          resolve({status,accepted:true});
        });
      });
      const timer=setTimeout(()=>req.destroy(new Error('Delivery timed out')),10000);
      req.once('close',()=>clearTimeout(timer));
      req.once('error',error=>reject(new Error(error.message==='Delivery timed out'?error.message:'Delivery transport failed')));
      req.end(bytes);
    });
  }
}
