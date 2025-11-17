import { describe, it, expect } from 'vitest';
import { moderateContent, sanitizeContent, validateMessage } from '../moderation.service';

describe('moderation.service', () => {
  describe('moderateContent', () => {
    it('should approve normal content', () => {
      const result = moderateContent('Hello, how are you?');
      expect(result.isApproved).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('should reject empty content', () => {
      const result = moderateContent('');
      expect(result.isApproved).toBe(false);
      expect(result.reason).toBe('Content is empty');
    });

    it('should reject content with excessive repetition', () => {
      const result = moderateContent('spam spam spam spam spam spam');
      expect(result.isApproved).toBe(false);
      expect(result.reason).toBe('Contains excessive repetition');
    });

    it('should reject content that is too long', () => {
      // Use varied content to avoid triggering pattern checks
      const longContent = Array(5001).fill('word').join(' ');
      const result = moderateContent(longContent);
      expect(result.isApproved).toBe(false);
      expect(result.reason).toBe('Message is too long');
    });

    it('should reject content with repeated characters', () => {
      const result = moderateContent('This is spam aaaaaaa');
      expect(result.isApproved).toBe(false);
    });
  });

  describe('sanitizeContent', () => {
    it('should remove HTML tags', () => {
      const result = sanitizeContent('Hello <script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should normalize whitespace', () => {
      const result = sanitizeContent('Hello    world\n\n\n');
      expect(result).toBe('Hello world');
    });

    it('should limit length', () => {
      const longContent = 'a'.repeat(6000);
      const result = sanitizeContent(longContent);
      expect(result.length).toBe(5000);
    });

    it('should trim content', () => {
      const result = sanitizeContent('  Hello world  ');
      expect(result).toBe('Hello world');
    });
  });

  describe('validateMessage', () => {
    it('should validate normal message', () => {
      const result = validateMessage('Hello, how are you?');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBeDefined();
    });

    it('should reject empty message', () => {
      const result = validateMessage('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    it('should reject message with only whitespace', () => {
      const result = validateMessage('   ');
      expect(result.isValid).toBe(false);
    });

    it('should reject inappropriate content', () => {
      const result = validateMessage('spam spam spam spam spam');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should sanitize valid content', () => {
      const result = validateMessage('  Hello world  ');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Hello world');
    });
  });
});

