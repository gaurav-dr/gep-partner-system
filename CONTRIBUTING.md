# Contributing to GEP Partner System

Thank you for your interest in contributing to the GEP Partner Assignment System! This document provides guidelines and information for contributors.

## 📋 Getting Started

1. **Fork the repository** and clone it locally
2. **Set up your development environment** following our [Development Guide](./docs/DEVELOPMENT.md)
3. **Create a feature branch** from `main` for your changes
4. **Make your changes** and ensure they follow our coding standards
5. **Test your changes** thoroughly using our test suite
6. **Submit a pull request** with a clear description

## 🛠️ Development Workflow

### Prerequisites

- Docker & Docker Compose (recommended)
- Node.js 18+ and npm
- Git
- Supabase CLI (optional)

### Local Setup

```bash
# Quick setup with Docker
git clone https://github.com/gaurav-dr/gep-partner-system.git
cd gep-partner-system
docker-compose up -d

# Or follow the detailed setup in docs/DEVELOPMENT.md
```

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Messages

Follow conventional commit format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Example: `feat: add AI-powered consultant matching algorithm`

## 🧪 Testing

Before submitting your contribution:

```bash
# Run Playwright tests
npm test

# Run with UI for debugging
npm run test:ui

# Run tests in headed mode
npm run test:headed
```

Ensure all tests pass and add new tests for new functionality.

## 📝 Code Standards

### Frontend (React/TypeScript)
- Use TypeScript for type safety
- Follow React hooks best practices
- Use TailwindCSS for styling
- Ensure responsive design
- Add proper error handling

### Backend (Node.js/Express)
- Use async/await for asynchronous operations
- Implement proper error handling
- Follow REST API conventions
- Add input validation
- Include proper logging

### Database
- Follow Supabase best practices
- Use RLS (Row Level Security) policies
- Write efficient queries
- Document schema changes

## 🔒 Security Guidelines

- Never commit sensitive information (API keys, passwords, etc.)
- Follow our [Security Guide](./docs/SECURITY.md)
- Use environment variables for configuration
- Implement proper authentication and authorization
- Validate all user inputs

## 📖 Documentation

- Update documentation for new features
- Add JSDoc comments for functions
- Update API documentation in `docs/API.md`
- Include examples for complex functionality

## 🐛 Reporting Issues

When reporting bugs:
1. **Search existing issues** first
2. **Use the issue template** if available
3. **Provide detailed reproduction steps**
4. **Include environment information**
5. **Add screenshots/logs** if relevant

## 📋 Pull Request Process

1. **Update documentation** if needed
2. **Ensure tests pass** locally
3. **Update CHANGELOG.md** with your changes
4. **Request review** from maintainers
5. **Address feedback** promptly

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
```

## 🌟 Areas for Contribution

We welcome contributions in:

- **AI/ML improvements** - Enhance consultant matching algorithms
- **Performance optimization** - Database queries, caching, etc.
- **User experience** - UI/UX improvements
- **Testing** - Increase test coverage
- **Documentation** - Improve guides and examples
- **Internationalization** - Greek language support
- **Accessibility** - WCAG compliance improvements

## 💬 Getting Help

- **Documentation**: Check our [comprehensive docs](./docs/)
- **Issues**: Search or create GitHub issues
- **Discussions**: Use GitHub Discussions for questions

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## 🙏 Recognition

Contributors are recognized in our release notes and documentation. Thank you for making GEP Partner System better!

---

**Last Updated**: September 2025