# Petrolube WhatsApp Bot - Test Suite

This repository contains a comprehensive test suite for the Petrolube WhatsApp Bot, covering unit tests, integration tests, end-to-end tests, and performance tests.

## Test Structure

```
tests/
├── setup.js                    # Test environment setup and global utilities
├── unit/                       # Unit tests for individual modules
│   ├── sessionManager.test.js  # Session management tests
│   ├── phoneNumberUtils.test.js # Phone number validation tests
│   ├── whatsappService.test.js # WhatsApp API service tests
│   ├── apiService.test.js      # External API integration tests
│   └── openaiService.test.js   # OpenAI image analysis tests
├── integration/                # Integration tests
│   └── webhook.test.js         # Webhook endpoint tests
├── e2e/                        # End-to-end workflow tests
│   └── completeWorkflow.test.js # Complete user journey tests
└── performance/                # Performance and load tests
    └── load.test.js            # Load testing and performance benchmarks
```

## Prerequisites

Before running the tests, make sure you have the following installed:

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Install dependencies:

```bash
npm install
```

2. Install test dependencies:

```bash
npm install --save-dev jest supertest nock
```

## Configuration

The test suite uses the following configuration files:

- `jest.config.js` - Jest configuration
- `tests/setup.js` - Test environment setup
- `.env.test` - Test environment variables (create this file)

### Environment Variables

Create a `.env.test` file with the following variables:

```env
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
API_TOKEN=test_api_token
PHONE_NUMBER_ID=test_phone_number_id
WEBHOOK_VERIFY_TOKEN=test_verify_token
OPENAI_API_KEY=test_openai_key
PYTHON_QR_API_URL=http://localhost:5000
EXTERNAL_API_BASE_URL=http://localhost:3001
CAMPAIGN_ACTIVE=true
PETROLUBE_TERMS_URL_OWNER=https://example.com/terms.pdf
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test Categories

#### Unit Tests Only

```bash
npm test -- --testPathPattern="tests/unit"
```

#### Integration Tests Only

```bash
npm test -- --testPathPattern="tests/integration"
```

#### End-to-End Tests Only

```bash
npm test -- --testPathPattern="tests/e2e"
```

#### Performance Tests Only

```bash
npm test -- --testPathPattern="tests/performance"
```

### Run Specific Test Files

```bash
npm test -- sessionManager.test.js
npm test -- phoneNumberUtils.test.js
npm test -- whatsappService.test.js
```

## Test Categories

### 1. Unit Tests (`tests/unit/`)

Unit tests focus on testing individual functions and modules in isolation.

#### sessionManager.test.js

- Session management functionality
- Wallet operations
- Oil change log management
- Message deduplication
- Inactivity timer management

#### phoneNumberUtils.test.js

- Phone number formatting and validation
- Country-specific validation (Saudi Arabia, Pakistan)
- International format handling
- Input sanitization

#### whatsappService.test.js

- WhatsApp message sending
- Image downloading
- Template message handling
- Error handling and retry logic

#### apiService.test.js

- External API integrations
- Mechanic validation
- QR code validation
- Customer validation
- Wallet operations
- Leaderboard functionality

#### openaiService.test.js

- Image analysis (number plate extraction)
- Foil counting
- API error handling
- Response parsing

### 2. Integration Tests (`tests/integration/`)

Integration tests verify that different modules work together correctly.

#### webhook.test.js

- Webhook verification
- Message processing
- API endpoint testing
- Error handling
- Session management integration

### 3. End-to-End Tests (`tests/e2e/`)

E2E tests simulate complete user workflows and business processes.

#### completeWorkflow.test.js

- Complete mechanic registration process
- Full oil change workflow
- Customer interaction flows
- Multi-language support
- Error recovery scenarios
- Concurrent user handling

### 4. Performance Tests (`tests/performance/`)

Performance tests ensure the system can handle expected load and maintain performance standards.

#### load.test.js

- Concurrent user load testing
- Message throughput testing
- Session management performance
- External API performance
- Memory usage monitoring
- Response time analysis
- Error handling under load

## Test Utilities

### Global Test Utilities (`tests/setup.js`)

The test setup provides global utilities for creating mock data:

```javascript
// Mock WhatsApp text message
const message = testUtils.mockWhatsAppMessage("Hello", "1234567890");

// Mock WhatsApp image message
const imageMessage = testUtils.mockImageMessage("1234567890");

// Mock WhatsApp button message
const buttonMessage = testUtils.mockButtonMessage("button_id", "1234567890");
```

## Mocking Strategy

The test suite uses comprehensive mocking to isolate the system under test:

### External APIs

- WhatsApp Business API (using nock)
- OpenAI API (using nock)
- External validation APIs (using nock)

### Environment Variables

- All environment variables are mocked in `tests/setup.js`
- Test-specific values are used to ensure consistency

### File System

- Image uploads are mocked
- Static file serving is tested

## Coverage

The test suite aims for comprehensive coverage including:

- **Function Coverage**: All exported functions are tested
- **Branch Coverage**: All conditional logic paths are tested
- **Error Path Coverage**: Error handling and edge cases are tested
- **Integration Coverage**: Module interactions are tested
- **Performance Coverage**: Load and stress scenarios are tested

## Continuous Integration

The test suite is designed to run in CI/CD environments:

```yaml
# Example GitHub Actions workflow
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "16"
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Debugging Tests

### Running Tests in Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Verbose Output

```bash
npm test -- --verbose
```

### Running Specific Test Cases

```bash
npm test -- -t "should validate phone number"
```

## Best Practices

### Writing New Tests

1. **Follow the existing structure**: Place tests in appropriate directories
2. **Use descriptive test names**: Test names should clearly describe what is being tested
3. **Mock external dependencies**: Use nock for HTTP mocking
4. **Test both success and failure cases**: Ensure error handling is tested
5. **Use test utilities**: Leverage the global test utilities for consistency

### Test Data Management

1. **Use realistic test data**: Phone numbers, names, and other data should be realistic
2. **Avoid hardcoded values**: Use variables and constants for test data
3. **Clean up after tests**: Use `beforeEach` and `afterEach` hooks for cleanup

### Performance Testing

1. **Set realistic expectations**: Performance thresholds should be based on actual requirements
2. **Monitor resource usage**: Track memory and CPU usage during tests
3. **Test under various conditions**: Include normal load, peak load, and error conditions

## Troubleshooting

### Common Issues

1. **Test timeout errors**: Increase timeout in `jest.config.js`
2. **Mock not working**: Ensure nock is properly configured and cleaned up
3. **Environment variable issues**: Check `.env.test` file exists and is properly formatted
4. **Memory issues**: Reduce concurrent test load or increase Node.js memory limit

### Debugging Tips

1. **Use console.log**: Add logging to understand test flow
2. **Check mock calls**: Verify that mocks are being called as expected
3. **Isolate failing tests**: Run individual tests to identify issues
4. **Check test data**: Ensure test data is valid and realistic

## Contributing

When adding new features or fixing bugs:

1. **Write tests first**: Follow TDD principles
2. **Update existing tests**: Ensure all tests pass with your changes
3. **Add new test categories**: If needed, create new test files or directories
4. **Update documentation**: Keep this README and test documentation current

## Support

For questions or issues with the test suite:

1. Check the troubleshooting section
2. Review existing test examples
3. Check Jest and Supertest documentation
4. Create an issue with detailed information about the problem
