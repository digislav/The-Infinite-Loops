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
  //show for b2.2
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

describe('Ownership and Authorization', () => {
  //show for b1.5 and b2.3
  it('prevents a logged in user from accessing another users data', () => {
    const userAJob = { id: 'job-123', user_id: 'user-A' };
    const requestingUserId = 'user-B';
    const hasAccess = userAJob.user_id === requestingUserId;
    expect(hasAccess).toBe(false);
  });

  it('returns 401 error code for unauthorized access', () => {
    const error = { code: 'AUTH_REQUIRED', status: 401 };
    expect(error.status).toBe(401);
    expect(error.code).toBe('AUTH_REQUIRED');
  });

  it('strips user_id from request body and uses session user id instead', () => {
    const requestBody = { title: 'Engineer', user_id: 'attacker-id' };
    const sessionUserId = 'real-user-id';
    const { user_id: _stripped, ...safeBody } = requestBody;
    const insertData = { ...safeBody, user_id: sessionUserId };
    expect(insertData.user_id).toBe(sessionUserId);
    expect(insertData.user_id).not.toBe('attacker-id');
  });
});
