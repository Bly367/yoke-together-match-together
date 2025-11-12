# Review Template for Section [NUMBER]: [SECTION_NAME]

## Review Information
- **Section:** [Section Number and Name]
- **Reviewer:** [Agent Name/ID]
- **Review Date:** [Date]
- **Review Status:** ⏳ Pending / ✅ Complete / 🔄 In Progress
- **Secondary Reviewer:** [Agent Name/ID]
- **Secondary Review Date:** [Date]

---

## Section Overview
**Brief description of what this section covers and its importance to the project.**

---

## Files Reviewed

### Primary Files
- `path/to/file1.ts` - [Description]
- `path/to/file2.tsx` - [Description]
- ...

### Related Files
- `path/to/related.ts` - [Description]
- ...

---

## Architecture Compliance

### ✅ Compliant Areas
- [ ] Follows Service → Hook → Component pattern
- [ ] No direct Supabase calls in components
- [ ] Proper use of React Query
- [ ] TypeScript types properly defined
- [ ] Error handling implemented
- [ ] Input validation present

### ⚠️ Non-Compliant Areas
- [List any architecture violations]

---

## Code Quality Assessment

### Strengths
1. [Strength 1 with example]
2. [Strength 2 with example]
3. ...

### Weaknesses
1. [Weakness 1 with example and location]
2. [Weakness 2 with example and location]
3. ...

---

## Detailed Findings

### 🔴 Critical Issues

#### Issue #1: [Title]
- **Location:** `file.ts:line-number`
- **Severity:** Critical
- **Description:** [Detailed description]
- **Impact:** [What this affects]
- **Recommendation:** [How to fix]
- **Code Example:**
```typescript
// Current code
[code snippet]

// Recommended fix
[code snippet]
```
- **Status:** ⏳ Pending / ✅ Fixed / 🔄 In Progress

---

### 🟡 High Priority Issues

#### Issue #1: [Title]
- **Location:** `file.ts:line-number`
- **Severity:** High
- **Description:** [Detailed description]
- **Impact:** [What this affects]
- **Recommendation:** [How to fix]
- **Status:** ⏳ Pending / ✅ Fixed / 🔄 In Progress

---

### 🟢 Medium Priority Issues

#### Issue #1: [Title]
- **Location:** `file.ts:line-number`
- **Severity:** Medium
- **Description:** [Brief description]
- **Recommendation:** [How to improve]
- **Status:** ⏳ Pending / ✅ Fixed / 🔄 In Progress

---

### 🔵 Low Priority Issues

#### Issue #1: [Title]
- **Location:** `file.ts:line-number`
- **Severity:** Low
- **Description:** [Brief description]
- **Recommendation:** [Enhancement suggestion]
- **Status:** ⏳ Pending / ✅ Fixed / 🔄 In Progress

---

## Security Review

### ✅ Security Strengths
- [Security strength 1]
- [Security strength 2]

### ⚠️ Security Concerns
- [Security concern 1]
- [Security concern 2]

### Recommendations
1. [Security recommendation 1]
2. [Security recommendation 2]

---

## Performance Review

### ✅ Performance Strengths
- [Performance strength 1]
- [Performance strength 2]

### ⚠️ Performance Issues
- [Performance issue 1]
- [Performance issue 2]

### Recommendations
1. [Performance recommendation 1]
2. [Performance recommendation 2]

---

## Testing Assessment

### Current Test Coverage
- **Unit Tests:** [Coverage %] / [Files tested]
- **Integration Tests:** [Coverage %] / [Files tested]
- **E2E Tests:** [Coverage %] / [Files tested]

### Missing Tests
- [ ] [Test case 1]
- [ ] [Test case 2]

### Test Quality
- [ ] Tests are well-written
- [ ] Tests cover edge cases
- [ ] Tests are maintainable

---

## Documentation Review

### ✅ Well Documented
- [Documentation strength 1]
- [Documentation strength 2]

### ⚠️ Documentation Gaps
- [Documentation gap 1]
- [Documentation gap 2]

### Recommendations
1. [Documentation recommendation 1]
2. [Documentation recommendation 2]

---

## Dependency Analysis

### External Dependencies
- `package-name@version` - [Usage and assessment]

### Internal Dependencies
- `@/services/service-name` - [Usage and assessment]
- `@/hooks/hook-name` - [Usage and assessment]

### Dependency Issues
- [Dependency issue 1]
- [Dependency issue 2]

---

## Code Duplication Check

### Duplicated Code Found
- [Location 1] duplicates [Location 2]
- [Location 3] duplicates [Location 4]

### Recommendations
- Extract to shared utility: `lib/shared-util.ts`
- Extract to shared hook: `hooks/shared-hook.ts`
- Extract to shared component: `components/SharedComponent.tsx`

---

## Accessibility Review

### ✅ Accessibility Strengths
- [Accessibility strength 1]
- [Accessibility strength 2]

### ⚠️ Accessibility Issues
- [Accessibility issue 1]
- [Accessibility issue 2]

### Recommendations
1. [Accessibility recommendation 1]
2. [Accessibility recommendation 2]

---

## Cross-Section Dependencies

### Dependencies on Other Sections
- **Section X:** [How this section depends on it]
- **Section Y:** [How this section depends on it]

### Dependencies from Other Sections
- **Section A:** [How it depends on this section]
- **Section B:** [How it depends on this section]

### Integration Issues
- [Integration issue 1]
- [Integration issue 2]

---

## Review Checklist

### Architecture
- [ ] Follows project architecture patterns
- [ ] No architecture violations
- [ ] Proper separation of concerns

### Code Quality
- [ ] Code is readable and maintainable
- [ ] No code duplication
- [ ] Proper error handling
- [ ] Input validation present

### Security
- [ ] No security vulnerabilities
- [ ] Proper authentication/authorization
- [ ] Input sanitization

### Performance
- [ ] No performance bottlenecks
- [ ] Proper caching
- [ ] Optimized queries

### Testing
- [ ] Adequate test coverage
- [ ] Tests are well-written
- [ ] Edge cases covered

### Documentation
- [ ] Code is documented
- [ ] JSDoc comments present
- [ ] README updated if needed

---

## Summary

### Overall Assessment
[Overall assessment of the section - Good / Needs Improvement / Critical Issues]

### Critical Actions Required
1. [Action 1]
2. [Action 2]
3. ...

### Recommended Next Steps
1. [Next step 1]
2. [Next step 2]
3. ...

---

## Secondary Review Notes

### Secondary Reviewer: [Name]
### Review Date: [Date]

### Agreement with Primary Review
- [ ] Agrees with all findings
- [ ] Has additional findings
- [ ] Disagrees with some findings

### Additional Findings
- [Additional finding 1]
- [Additional finding 2]

### Resolved Conflicts
- [Conflict resolution 1]
- [Conflict resolution 2]

---

## Review Sign-off

- **Primary Reviewer:** [Name] - [Date] - [Signature/Status]
- **Secondary Reviewer:** [Name] - [Date] - [Signature/Status]
- **Section Status:** ⏳ Pending Review / ✅ Approved / 🔄 Needs Revision

---

**Review Template Version:** 1.0
**Last Updated:** [Date]

