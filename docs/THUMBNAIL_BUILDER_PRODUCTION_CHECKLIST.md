# Thumbnail Builder - Production Checklist

## 🚨 Critical (Must Complete Before Launch)

### Backend Implementation
- [ ] **Implement actual file upload API**
  - [ ] Blob storage integration (Azure Blob/S3)
  - [ ] Generate unique file names
  - [ ] Return proper media URLs
  - [ ] File size validation
  - [ ] File type validation
  - [ ] Duration validation for videos (5s max)

- [ ] **Database Schema**
  - [ ] Add `thumbnailV2` column to services table
  - [ ] Ensure JSON serialization works correctly
  - [ ] Add database migration script
  - [ ] Test with sample data

- [ ] **GraphQL Resolver**
  - [ ] Implement `create_reading_offer` mutation
  - [ ] Handle thumbnailV2 input
  - [ ] Store in database
  - [ ] Return proper response

- [ ] **Video Processing**
  - [ ] Validate video duration (5s max)
  - [ ] Optional: Auto-trim videos over 5s
  - [ ] Optional: Generate video thumbnail
  - [ ] Validate video format

## ⚠️ Important (Should Complete)

### Frontend Polish
- [ ] **Replace mock upload handlers**
  - [ ] Implement actual upload in `UseCreateReadingOffer.tsx`
  - [ ] Add upload progress bars
  - [ ] Add error handling & user feedback
  - [ ] Add retry logic

- [ ] **ThumbnailDisplay Component**
  - [ ] Create component to render v2 thumbnails
  - [ ] Implement video autoplay on hover/scroll
  - [ ] Implement collage fade animations
  - [ ] Add loading states
  - [ ] Add fallback for missing images

- [ ] **Form Validation**
  - [ ] Add Zod/Yup schema validation
  - [ ] Show error messages
  - [ ] Prevent invalid submissions
  - [ ] Add file size warnings before upload

- [ ] **Loading States**
  - [ ] Show spinner during uploads
  - [ ] Disable form during submission
  - [ ] Show progress percentages
  - [ ] Add success/error toasts

### UX Enhancements
- [ ] **Accessibility**
  - [ ] Add ARIA labels to all inputs
  - [ ] Keyboard navigation support
  - [ ] Screen reader announcements
  - [ ] Focus management between steps
  - [ ] Alt text for images

- [ ] **Mobile Responsiveness**
  - [ ] Test on mobile devices
  - [ ] Adjust upload buttons for touch
  - [ ] Ensure preview looks good on small screens
  - [ ] Test step navigation on mobile

- [ ] **User Guidance**
  - [ ] Add tooltips explaining each mode
  - [ ] Add example thumbnails
  - [ ] Add "Why choose this mode?" hints
  - [ ] Add file size/format requirements

## 📊 Testing

### Unit Tests
- [ ] ThumbnailBuilder component
- [ ] Multi-step form navigation
- [ ] Upload handler functions
- [ ] Validation logic
- [ ] Form submission

### Integration Tests
- [ ] Complete reading creation flow
- [ ] File upload integration
- [ ] GraphQL mutation
- [ ] Database storage

### E2E Tests
- [ ] User can create reading with cover photo only
- [ ] User can create reading with video mode
- [ ] User can create reading with collage mode
- [ ] User can navigate back and edit
- [ ] User can remove uploaded files
- [ ] Form validation prevents invalid submissions

### Edge Cases
- [ ] Very large files (near limits)
- [ ] Invalid file formats
- [ ] Corrupted files
- [ ] Network errors during upload
- [ ] Videos longer than 5 seconds
- [ ] Browser compatibility (Chrome, Firefox, Safari, Edge)

## 🔐 Security

- [ ] **File Upload Security**
  - [ ] Validate file types on server
  - [ ] Check file sizes on server
  - [ ] Scan for malware
  - [ ] Prevent path traversal
  - [ ] Use secure file names

- [ ] **Authorization**
  - [ ] Verify merchant owns the service
  - [ ] Rate limit uploads
  - [ ] Prevent abuse

## 📈 Performance

- [ ] **Optimization**
  - [ ] Compress images before upload
  - [ ] Lazy load preview images
  - [ ] Use optimized video codec
  - [ ] CDN for uploaded media
  - [ ] Thumbnail generation

- [ ] **Monitoring**
  - [ ] Track upload success/failure rates
  - [ ] Monitor file sizes
  - [ ] Track mode usage (None/Video/Collage)
  - [ ] Performance metrics

## 📝 Documentation

- [ ] **Developer Docs**
  - [x] Implementation summary (DONE)
  - [x] Visual guide (DONE)
  - [ ] API documentation
  - [ ] Code comments
  - [ ] Architecture decisions

- [ ] **User Docs**
  - [ ] How to create thumbnails guide
  - [ ] Mode selection guide
  - [ ] Best practices
  - [ ] FAQ

- [ ] **Admin Docs**
  - [ ] Storage management
  - [ ] Migration guide
  - [ ] Troubleshooting

## 🔄 Migration

- [ ] **Existing Data**
  - [ ] Identify services with old thumbnails
  - [ ] Create migration script
  - [ ] Test migration with sample data
  - [ ] Plan rollout strategy
  - [ ] Create rollback plan

- [ ] **Backwards Compatibility**
  - [ ] Support both thumbnail formats
  - [ ] Gradual migration
  - [ ] No breaking changes

## 🎨 Design Review

- [ ] **Designer Sign-off**
  - [ ] Step indicator design
  - [ ] Upload button styling
  - [ ] Preview layout
  - [ ] Mobile design
  - [ ] Error states
  - [ ] Success states

- [ ] **Branding**
  - [ ] Colors match brand
  - [ ] Icons consistent
  - [ ] Typography consistent

## 🚀 Deployment

- [ ] **Pre-Launch**
  - [ ] Code review
  - [ ] QA testing
  - [ ] Staging environment testing
  - [ ] Performance testing
  - [ ] Security audit

- [ ] **Launch**
  - [ ] Deploy backend changes
  - [ ] Deploy frontend changes
  - [ ] Run database migration
  - [ ] Monitor for errors
  - [ ] Monitor performance
  - [ ] Gather user feedback

- [ ] **Post-Launch**
  - [ ] Analytics setup
  - [ ] Monitor usage
  - [ ] Collect feedback
  - [ ] Iterate based on feedback

## 🎯 Success Metrics

Track these after launch:
- [ ] % of readings created with thumbnails
- [ ] Mode distribution (None/Video/Collage)
- [ ] Upload success rate
- [ ] Average time to complete
- [ ] User drop-off points
- [ ] Error rates
- [ ] User satisfaction

---

## Priority Order

1. **CRITICAL** - File upload API + Backend resolver
2. **CRITICAL** - Database integration
3. **HIGH** - Form validation + Error handling
4. **HIGH** - ThumbnailDisplay component
5. **MEDIUM** - Accessibility
6. **MEDIUM** - Testing
7. **LOW** - Analytics & monitoring

**Estimated Time to Production Ready:** 2-3 weeks (with full team)

**Can Launch MVP With:** Items marked CRITICAL + basic error handling
