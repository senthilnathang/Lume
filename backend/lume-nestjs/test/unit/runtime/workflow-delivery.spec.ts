import { jest } from '@jest/globals';
import { WorkflowDeliveryService, publicIPv4 } from '../../../src/core/workflow/workflow-delivery.service';
describe('Workflow delivery boundary',()=>{
  const original={...process.env};
  afterEach(()=>{process.env={...original};jest.restoreAllMocks();});
  it.each(['127.0.0.1','10.1.2.3','172.16.1.1','192.168.1.1','169.254.169.254','100.64.1.1','0.0.0.0','224.0.0.1','::1','::ffff:127.0.0.1','198.18.0.1'])('rejects nonpublic addresses: %s',address=>expect(publicIPv4(address)).toBe(false));
  it('accepts a public IPv4 address',()=>expect(publicIPv4('8.8.8.8')).toBe(true));
  it.each(['http://example.com','https://user:pass@example.com','https://example.com:8443','https://unapproved.example'])('rejects unsafe destinations before network access',async url=>{
    process.env.WORKFLOW_DELIVERY_HOSTS='example.com';
    await expect(new WorkflowDeliveryService().post(url,{},'test')).rejects.toThrow('not allowed');
  });
  it('rejects private IPs even when explicitly allowlisted',async()=>{
    process.env.WORKFLOW_DELIVERY_HOSTS='127.0.0.1';
    await expect(new WorkflowDeliveryService().post('https://127.0.0.1',{},'test')).rejects.toThrow('public');
  });
  it('requires configured delivery gateway credentials',async()=>{
    delete process.env.WORKFLOW_EMAIL_GATEWAY_URL;delete process.env.WORKFLOW_EMAIL_GATEWAY_TOKEN;
    await expect(new WorkflowDeliveryService().deliver({channel:'email',body:{}},'test')).rejects.toThrow('not configured');
  });
  it('forwards the stable idempotency key and operator gateway token',async()=>{
    process.env.WORKFLOW_PUSH_GATEWAY_URL='https://gateway.example/push';process.env.WORKFLOW_PUSH_GATEWAY_TOKEN='test-token';
    const service=new WorkflowDeliveryService();const post=jest.spyOn(service,'post').mockResolvedValue({status:202,accepted:true});
    await service.deliver({channel:'push',body:{userId:1}},'stable-job-key');
    expect(post).toHaveBeenCalledWith('https://gateway.example/push',{userId:1},'stable-job-key','test-token');
  });
});
