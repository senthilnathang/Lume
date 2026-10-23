import { jest } from '@jest/globals';
import { AIAdapterService } from '../../../src/core/ai/ai-adapter.service';
describe('AI provider execution',()=>{
  let service:AIAdapterService;
  beforeEach(()=>{service=new AIAdapterService();service.setApiKey('test-only');service.setDefaultModel('configured-model');});
  afterEach(()=>jest.restoreAllMocks());
  const response=(extra={})=>new Response(JSON.stringify({content:[{type:'text',text:'Real result'}],model:'configured-model',usage:{input_tokens:3,output_tokens:4},stop_reason:'end_turn',...extra}),{status:200});
  it('sends the configured request and validates real output and usage',async()=>{
    const call=jest.spyOn(globalThis,'fetch').mockResolvedValue(response());
    expect(await service.complete('Summarize')).toEqual({text:'Real result',tokens:7,model:'configured-model'});
    const [url,options]=call.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(JSON.parse(options.body as string)).toMatchObject({model:'configured-model',max_tokens:1024,messages:[{role:'user',content:'Summarize'}]});
    expect(options.redirect).toBe('error');expect(options.signal).toBeDefined();
  });
  it('fails without credentials or a model instead of fabricating output',async()=>{
    service.setApiKey('');await expect(service.complete('Test')).rejects.toThrow('not configured');
    service.setApiKey('key');service.setDefaultModel('');await expect(service.complete('Test')).rejects.toThrow('model');
    await expect(service.embed('Test')).rejects.toThrow('embedding provider');
  });
  it('rejects provider failures without echoing response bodies or credentials',async()=>{
    jest.spyOn(globalThis,'fetch').mockResolvedValue(new Response('secret provider details',{status:429}));
    await expect(service.complete('Test')).rejects.toThrow('HTTP 429');
  });
  it.each([{content:[]},{usage:{input_tokens:-1,output_tokens:2}},{stop_reason:'max_tokens'}])('rejects invalid or truncated output',async extra=>{
    jest.spyOn(globalThis,'fetch').mockResolvedValue(response(extra));await expect(service.complete('Test')).rejects.toThrow();
  });
  it('rejects invented classifications and does not invent confidence',async()=>{
    jest.spyOn(service,'complete').mockResolvedValue({text:'yes',tokens:1,model:'test'});
    expect(await service.classify('Text',['yes','no'])).toEqual({label:'yes',confidence:null});
    await expect(service.classify('Text',['other'])).rejects.toThrow('invalid classification');
  });
});
