# Multi-Agent Code Review System Guide

## Overview
This guide explains how to use the multi-agent code review system for the Yoke project. The system divides the project into 12 distinct sections, each assigned to different reviewers (agents) for comprehensive quality assurance.

---

## System Architecture

### Core Documents

1. **PROJECT_DIVISION.md** - Defines all 12 sections and their file assignments
2. **REVIEW_TEMPLATE.md** - Standard template for all section reviews
3. **REVIEW_TRACKING.md** - Dashboard for tracking review progress and issues
4. **REVIEW_QUALITY_STANDARDS.md** - Quality criteria and review standards
5. **REVIEW_INDEX.md** - Master index of all reviews (existing)
6. **REVIEW_SECTION_XX_[NAME].md** - Individual section review documents

---

## How the System Works

### Step 1: Project Division
The project is divided into 12 logical sections:
1. Authentication & Security
2. User Profiles & Onboarding
3. Duo Management
4. Matching & Swiping System
5. Chat & Messaging
6. Location Services
7. Routing & Navigation
8. UI Components & Styling
9. Database & Integrations
10. Configuration & Build
11. Testing & Quality
12. Documentation & Developer Experience

Each section has:
- Clear file boundaries
- Specific review focus areas
- Review checklist
- Assigned reviewers (primary + secondary)

### Step 2: Review Assignment
Each section is assigned to:
- **Primary Reviewer (Agent):** Conducts initial comprehensive review
- **Secondary Reviewer (Agent):** Validates findings and adds additional insights

### Step 3: Review Process
1. **Primary Review:** Agent reviews section using REVIEW_TEMPLATE.md
2. **Documentation:** Findings documented in REVIEW_SECTION_XX_[NAME].md
3. **Secondary Review:** Second agent reviews and validates
4. **Issue Tracking:** All issues tracked in REVIEW_TRACKING.md
5. **Resolution:** Issues fixed and verified

### Step 4: Quality Assurance
- All reviews follow REVIEW_QUALITY_STANDARDS.md
- Issues categorized by severity (Critical, High, Medium, Low)
- Progress tracked in REVIEW_TRACKING.md

---

## Getting Started

### For Reviewers

1. **Get Assigned Section**
   - Check PROJECT_DIVISION.md for your section
   - Review the file list and focus areas
   - Understand the review checklist

2. **Start Review**
   - Copy REVIEW_TEMPLATE.md
   - Rename to REVIEW_SECTION_XX_[NAME].md
   - Fill in section-specific information

3. **Conduct Review**
   - Review all files in your section
   - Check against REVIEW_QUALITY_STANDARDS.md
   - Document findings using the template
   - Categorize issues by severity

4. **Update Tracking**
   - Add findings to REVIEW_TRACKING.md
   - Update review status
   - Assign issues to developers

5. **Complete Review**
   - Mark review as complete
   - Sign off on review document
   - Hand off to secondary reviewer

### For Secondary Reviewers

1. **Review Primary Findings**
   - Read primary reviewer's document
   - Validate findings
   - Check for missed issues

2. **Add Additional Findings**
   - Document any additional issues
   - Resolve conflicts if any
   - Sign off on review

### For Developers

1. **Check Assigned Issues**
   - Review REVIEW_TRACKING.md
   - Find issues assigned to you
   - Understand requirements

2. **Fix Issues**
   - Implement fixes
   - Follow code standards
   - Update issue status

3. **Verify Fixes**
   - Request review verification
   - Update tracking document
   - Mark as resolved

---

## Review Workflow

```
┌─────────────────┐
│ Assign Section  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Primary Review  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Document Issues │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Secondary Review│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Track Issues    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fix Issues      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verify Fixes    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Complete Review │
└─────────────────┘
```

---

## Section Review Checklist

Each section review should check:

### Architecture Compliance
- [ ] Follows Service → Hook → Component pattern
- [ ] No direct Supabase calls in components
- [ ] Proper use of React Query
- [ ] Clear separation of concerns

### Code Quality
- [ ] Code is readable and maintainable
- [ ] No code duplication
- [ ] Proper error handling
- [ ] Input validation present

### Security
- [ ] No security vulnerabilities
- [ ] Proper authentication/authorization
- [ ] Input sanitization
- [ ] Secure error handling

### Performance
- [ ] No performance bottlenecks
- [ ] Proper caching
- [ ] Optimized queries
- [ ] Code splitting where appropriate

### Testing
- [ ] Adequate test coverage
- [ ] Tests are well-written
- [ ] Edge cases covered

### Documentation
- [ ] Code is documented
- [ ] JSDoc comments present
- [ ] README updated if needed

---

## Issue Severity Guidelines

### 🔴 Critical (Fix Immediately)
- Security vulnerabilities
- Data loss risks
- Race conditions
- Architecture violations
- Critical bugs

**Resolution Time:** 24 hours

### 🟡 High Priority (Fix Soon)
- Performance bottlenecks
- Missing error handling
- Code duplication
- Missing validation
- Significant bugs

**Resolution Time:** 1 week

### 🟢 Medium Priority (Fix When Possible)
- Code quality improvements
- Documentation gaps
- Test coverage gaps
- Minor optimizations

**Resolution Time:** 2-4 weeks

### 🔵 Low Priority (Nice to Have)
- Code style improvements
- Minor optimizations
- Enhancement suggestions
- Future improvements

**Resolution Time:** When convenient

---

## Review Documents Structure

### Section Review Document Format
```
REVIEW_SECTION_XX_[NAME].md
├── Review Information
├── Section Overview
├── Files Reviewed
├── Architecture Compliance
├── Code Quality Assessment
├── Detailed Findings
│   ├── Critical Issues
│   ├── High Priority Issues
│   ├── Medium Priority Issues
│   └── Low Priority Issues
├── Security Review
├── Performance Review
├── Testing Assessment
├── Documentation Review
├── Review Checklist
└── Summary
```

---

## Tracking Progress

### Review Status Indicators
- ⏳ **Pending** - Not started
- 🔄 **In Progress** - Currently being reviewed
- ✅ **Complete** - Review finished
- 🔍 **Needs Revision** - Issues found, needs fixes

### Issue Status Indicators
- ⏳ **Pending** - Issue identified, not yet assigned
- 🔄 **In Progress** - Issue assigned, work in progress
- ✅ **Fixed** - Issue resolved, needs verification
- ✅ **Verified** - Issue fixed and verified
- ❌ **Won't Fix** - Issue acknowledged but won't be fixed

---

## Best Practices

### For Reviewers
1. **Be Thorough:** Review all files in your section
2. **Be Specific:** Provide exact file locations and code examples
3. **Be Constructive:** Explain why something is an issue
4. **Be Consistent:** Follow the review template
5. **Be Timely:** Complete reviews within assigned timeframe

### For Developers
1. **Read Carefully:** Understand the issue fully
2. **Ask Questions:** Clarify if needed
3. **Fix Properly:** Don't create workarounds
4. **Update Status:** Keep tracking document updated
5. **Verify:** Ensure fix resolves the issue

### For Project Managers
1. **Assign Clearly:** Ensure reviewers understand their sections
2. **Track Progress:** Monitor REVIEW_TRACKING.md regularly
3. **Resolve Blockers:** Address any blockers quickly
4. **Ensure Quality:** Verify all critical issues are resolved
5. **Celebrate Success:** Acknowledge good work

---

## Common Issues and Solutions

### Issue: Overlapping Sections
**Solution:** Clearly define boundaries in PROJECT_DIVISION.md. If overlap occurs, coordinate between reviewers.

### Issue: Conflicting Findings
**Solution:** Secondary reviewer validates. If conflict persists, escalate to technical lead.

### Issue: Missing Context
**Solution:** Reviewers should read related sections and ask questions before reviewing.

### Issue: Too Many Issues
**Solution:** Prioritize by severity. Focus on Critical and High priority first.

### Issue: Review Taking Too Long
**Solution:** Break large sections into smaller chunks. Set time limits per section.

---

## Review Metrics

Track these metrics in REVIEW_TRACKING.md:
- Total files reviewed
- Total issues found (by severity)
- Issues resolved
- Average resolution time
- Code coverage
- Architecture compliance percentage
- Security score
- Performance score

---

## Next Steps

1. **Assign Reviewers:** Update PROJECT_DIVISION.md with actual reviewer assignments
2. **Set Schedule:** Define review timeline in REVIEW_TRACKING.md
3. **Start Reviews:** Begin Phase 1 individual section reviews
4. **Track Progress:** Regularly update REVIEW_TRACKING.md
5. **Resolve Issues:** Fix critical and high priority issues
6. **Complete Reviews:** Finish all sections and verify quality

---

## Support and Questions

If you have questions about the review system:
1. Check this guide first
2. Review REVIEW_QUALITY_STANDARDS.md
3. Check PROJECT_DIVISION.md for section details
4. Ask in team chat or create an issue

---

**System Version:** 1.0
**Last Updated:** [Current Date]
**Maintained By:** Development Team

