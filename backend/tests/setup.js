jest.setTimeout(30000);

beforeAll(() => {
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  process.env.NODE_ENV = 'test';
});
