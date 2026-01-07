# Manual Testing Guide - EndlessDimensions Mod

## Overview
This guide provides comprehensive manual testing procedures for the EndlessDimensions mod functionality.

## Prerequisites
- Minecraft server with Moud framework installed
- EndlessDimensions mod built and deployed
- Test world in creative mode
- Admin/OP permissions

## Core Functionality Testing

### 1. Dimension Creation Testing

#### Test Case 1.1: Basic Noise Dimension
**Steps:**
1. Obtain a written book and quill
2. Title: "Test Noise Dimension"
3. Author: "Tester"
4. Page 1: "This is a test noise dimension"
5. Sign the book
6. Build a nether portal (obsidian frame, 4x5 minimum)
7. Activate portal with flint and steel
8. Throw the signed book into the portal
9. Wait for dimension creation (check console logs)

**Expected Results:**
- Console shows dimension creation initiated
- New dimension appears in server logs
- No server errors or crashes
- Dimension ID generated successfully

#### Test Case 1.2: Flat Dimension
**Steps:**
1. Create book with title "Flat World Test"
2. Content: "Generate a flat dimension"
3. Repeat portal throw process

**Expected Results:**
- Flat world generator configuration created
- Dimension properties show flat generator type

#### Test Case 1.3: Void Dimension
**Steps:**
1. Create book with title "Void Test"
2. Content: "Empty void dimension"
3. Repeat portal throw process

**Expected Results:**
- Void generator configuration created
- Sea level set to -64
- Minimal terrain generation

### 2. Easter Egg Dimension Testing

#### Test Case 2.1: Antimatter Dimension
**Steps:**
1. Create book with title "antimatter"
2. Content: "Antimatter dimension test"
3. Throw in portal

**Expected Results:**
- Special easter egg dimension created
- Unique properties applied
- Console shows easter egg detection

#### Test Case 2.2: Other Easter Eggs
**Test these known easter eggs:**
- "chess"
- "library"
- "fancy"
- "antimatter"
- "shapes"
- "colors"

### 3. Portal System Testing

#### Test Case 3.1: Portal Detection
**Steps:**
1. Build various portal configurations:
   - Standard nether portal (4x5)
   - Custom size portals
   - Corner portals
2. Place book entity near each portal
3. Check console for detection logs

**Expected Results:**
- All valid portals detected
- Spatial scanner identifies portal blocks
- No false positives for non-portal obsidian

#### Test Case 3.2: Book-Portal Collision
**Steps:**
1. Build activated portal
2. Drop book from various heights:
   - Direct drop into portal
   - Throw from distance
   - Drop on portal edge
3. Monitor collision detection

**Expected Results:**
- Collision detected in all valid cases
- Book data extracted correctly
- No false collisions

### 4. Block Registry Testing

#### Test Case 4.1: Block Loading
**Steps:**
1. Start server with internet connection
2. Monitor console during startup
3. Check block registry initialization logs

**Expected Results:**
- Blocks fetched from external API
- Blacklist applied correctly
- Safe blocks count > 0

#### Test Case 4.2: Block Selection
**Steps:**
1. Create multiple dimensions
2. Check default block assignments
3. Verify no blacklisted blocks used

**Expected Results:**
- Only safe blocks selected
- Variety in block assignments
- No air, barriers, or problematic blocks

### 5. Performance Testing

#### Test Case 5.1: Multiple Dimensions
**Steps:**
1. Create 10+ dimensions rapidly
2. Monitor server performance
3. Check memory usage

**Expected Results:**
- Server remains stable
- Memory usage reasonable
- No significant lag spikes

#### Test Case 5.2: Large World Generation
**Steps:**
1. Travel to generated dimension
2. Explore large areas
3. Monitor chunk generation

**Expected Results:**
- Smooth chunk loading
- No world corruption
- Consistent performance

### 6. Error Handling Testing

#### Test Case 6.1: Invalid Books
**Steps:**
1. Throw unsigned books in portal
2. Throw books without valid data
3. Throw corrupted books

**Expected Results:**
- Graceful error handling
- Server remains stable
- Clear error messages

#### Test Case 6.2: Network Issues
**Steps:**
1. Start server without internet
2. Test block registry fallback
3. Verify dimension creation still works

**Expected Results:**
- Fallback blacklist used
- Basic functionality preserved
- Clear warning messages

## Regression Testing Checklist

### Before Each Test Session:
- [ ] Server clean start
- [ ] Latest mod version installed
- [ ] Backup test world
- [ ] Console logging enabled

### After Each Test Session:
- [ ] No server crashes
- [ ] No world corruption
- [ ] All dimensions accessible
- [ ] Performance acceptable

## Bug Report Template

When reporting issues, include:
1. **Test Case**: Which test failed
2. **Steps to Reproduce**: Exact actions taken
3. **Expected Results**: What should have happened
4. **Actual Results**: What actually happened
5. **Environment**: Server version, mod version
6. **Console Logs**: Relevant error messages
7. **Screenshots**: If applicable

## Automated Testing Integration

To set up automated testing:
1. Add test script to package.json
2. Configure test runner (Jest/Mocha)
3. Create unit tests for core classes
4. Set up CI/CD pipeline
5. Add integration test execution

## Performance Benchmarks

Monitor these metrics:
- Dimension creation time: < 30 seconds
- Memory usage per dimension: < 50MB
- Portal detection response: < 1 second
- Block registry loading: < 10 seconds
- Server tick time: < 50ms average

## Troubleshooting Common Issues

### Dimension Creation Fails
- Check internet connectivity for block registry
- Verify portal structure validity
- Check console for error messages
- Ensure sufficient disk space

### Performance Issues
- Limit concurrent dimension creation
- Monitor memory usage
- Check for world corruption
- Reduce render distance in test

### Portal Detection Issues
- Verify obsidian frame完整性
- Check portal activation state
- Ensure proper lighting
- Test different portal sizes
