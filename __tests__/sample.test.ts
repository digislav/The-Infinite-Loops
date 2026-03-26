describe('Sample Frontend Test', () => {
  it('adds two numbers correctly', () => {
    const result = 1 + 2;
    expect(result).toBe(3);
  });

  it('returns true when a string is not empty', () => {
    const name = 'John';
    expect(name.length).toBeGreaterThan(0);
  });
});

describe('Sample Backend Test', () => {
  it('correctly formats a user object', () => {
    const user = { id: '123', email: 'test@example.com' };
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
  });

  it('returns 401 error code for unauthorized access', () => {
    const error = { code: 'AUTH_REQUIRED', status: 401 };
    expect(error.status).toBe(401);
    expect(error.code).toBe('AUTH_REQUIRED');
  });
});
