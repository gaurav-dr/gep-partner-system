# Security Policy

## Reporting Security Vulnerabilities

We take the security of the GEP Partner Assignment System seriously. If you believe you have found a security vulnerability, please report it to us as described below.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.4.x   | :white_check_mark: |
| 1.3.x   | :white_check_mark: |
| < 1.3   | :x:                |

## How to Report a Security Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@gep-system.com**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

### What to Include

When reporting a vulnerability, please include:

- **Description of the vulnerability** and its potential impact
- **Steps to reproduce** the issue
- **Affected versions** or components
- **Your assessment** of the severity
- **Possible mitigation** or fix suggestions (if any)
- **Your contact information** for follow-up questions

## Security Response Process

1. **Acknowledgment**: We'll acknowledge receipt of your report within 48 hours
2. **Investigation**: Our security team will investigate and assess the vulnerability
3. **Coordination**: We'll work with you to understand the scope and impact
4. **Resolution**: We'll develop and test a fix
5. **Disclosure**: We'll coordinate the public disclosure timeline with you
6. **Recognition**: We'll acknowledge your contribution (with your permission)

## Security Best Practices

For detailed security implementation and best practices, please refer to our comprehensive [Security Implementation Guide](./docs/SECURITY_IMPLEMENTATION.md).

### Key Security Features

- **Credential Management**: All sensitive data managed through environment variables
- **Input Validation**: Comprehensive validation and sanitization with Joi
- **Security Headers**: Helmet.js with CSP, HSTS, and other security headers
- **Authentication**: JWT-based authentication with secure password hashing
- **Database Security**: Supabase RLS policies for data protection
- **Rate Limiting**: Protection against abuse and DoS attacks
- **CORS Configuration**: Proper origin restrictions and security policies

### For Developers

- **Never commit secrets** or credentials to the repository
- **Follow secure coding practices** outlined in our [Contributing Guide](./CONTRIBUTING.md)
- **Use environment variables** for all configuration
- **Implement proper error handling** without exposing sensitive information
- **Add security tests** for new functionality
- **Review code** for security implications before merging

## Security Updates

Security updates will be released as patch versions and announced through:

- GitHub Security Advisories
- Release notes in [CHANGELOG.md](./CHANGELOG.md)
- Email notifications to registered users (for critical vulnerabilities)

## Compliance

The GEP Partner System implements security measures to comply with:

- **Greek SEPE regulations** for healthcare data handling
- **GDPR** for personal data protection
- **General security best practices** for web applications

## Bug Bounty Program

Currently, we do not have a formal bug bounty program. However, we greatly appreciate security researchers who responsibly disclose vulnerabilities and will acknowledge their contributions appropriately.

## Contact Information

- **Security Issues**: security@gep-system.com
- **General Questions**: support@gep-system.com
- **Development Team**: dev@gep-system.com

---

**Last Updated**: September 2025  
**Version**: 1.4.0