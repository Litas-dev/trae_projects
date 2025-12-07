// Firebase-powered Social Platform App
let currentUser = null;
let userProfile = {};

// ============== INITIALIZATION ==============
// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Attach form event listeners - MUST use if checks to prevent errors
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Attach dropdown toggle
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('user-dropdown');
        const userMenu = e.target.closest('.user-menu');
        if (dropdown && !userMenu) {
            dropdown.classList.remove('show');
        }
    });

    // Close modals when clicking outside
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });

    // Load theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // Add dark mode toggle event listener
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.checked = document.body.classList.contains('dark-mode');
        darkModeToggle.addEventListener('change', toggleTheme);
    }

    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            switchPage('dashboard-page');
            displayUserInfo();
            showMobileNavIfNeeded();
            console.log('User logged in:', user.email);
        } else {
            currentUser = null;
            switchPage('login-page');
            hideMobileNav();
            console.log('User logged out');
        }
    });
    
    // Show/hide mobile nav on resize
    window.addEventListener('resize', showMobileNavIfNeeded);
});

/**
 * Show mobile navigation on mobile screens
 */
function showMobileNavIfNeeded() {
    const mobileNav = document.querySelector('.mobile-nav');
    if (window.innerWidth <= 768) {
        if (mobileNav) mobileNav.style.display = 'flex';
    } else {
        if (mobileNav) mobileNav.style.display = 'none';
    }
}

/**
 * Hide mobile navigation
 */
function hideMobileNav() {
    const mobileNav = document.querySelector('.mobile-nav');
    if (mobileNav) mobileNav.style.display = 'none';
}

/**
 * Switch between pages
 */
function switchPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    document.getElementById(pageId).classList.add('active');
}

/**
 * Handle Login with Firebase
 */
function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;

    // Sign in with Firebase
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Sign in successful
            currentUser = userCredential.user;
            console.log('Login successful:', currentUser.email);

            // Clear form
            document.getElementById('login-form').reset();

            // Switch to dashboard
            switchPage('dashboard-page');
            displayUserInfo();
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;

            console.error('Login error:', errorCode, errorMessage);

            // Show user-friendly error messages
            if (errorCode === 'auth/user-not-found') {
                alert('No account found with this email. Please sign up first.');
            } else if (errorCode === 'auth/wrong-password') {
                alert('Incorrect password. Please try again.');
            } else if (errorCode === 'auth/invalid-email') {
                alert('Invalid email address.');
            } else if (errorCode === 'auth/user-disabled') {
                alert('This account has been disabled.');
            } else {
                alert('Login failed: ' + errorMessage);
            }
        })
        .finally(() => {
            // Restore button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
}

/**
 * Handle Signup with Firebase
 */
function handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;

    // Validation
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long!');
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating account...';
    submitBtn.disabled = true;

    // Create user with Firebase
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // User created successfully
            currentUser = userCredential.user;

            // Update user profile with name
            return currentUser.updateProfile({
                displayName: name
            }).then(() => {
                // Save user data to Realtime Database
                return database.ref('users/' + currentUser.uid).set({
                    uid: currentUser.uid,
                    name: name,
                    email: email,
                    joinedDate: new Date().toISOString(),
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
            });
        })
        .then(() => {
            console.log('Signup successful:', currentUser.email);

            // Clear form
            document.getElementById('signup-form').reset();

            // Switch to dashboard
            switchPage('dashboard-page');
            displayUserInfo();
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;

            console.error('Signup error:', errorCode, errorMessage);

            // Show user-friendly error messages
            if (errorCode === 'auth/email-already-in-use') {
                alert('Email already in use. Please use a different email or login.');
            } else if (errorCode === 'auth/weak-password') {
                alert('Password is too weak. Please use a stronger password (min 6 characters).');
            } else if (errorCode === 'auth/invalid-email') {
                alert('Invalid email address.');
            } else {
                alert('Signup failed: ' + errorMessage);
            }
        })
        .finally(() => {
            // Restore button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
}

/**
 * Display user information on dashboard
 */
function displayUserInfo() {
    if (currentUser) {
        const displayName = currentUser.displayName || 'User';
        const email = currentUser.email || 'user@example.com';
        const emailHandle = '@' + email.split('@')[0];
        
        const joinedDate = currentUser.metadata?.creationTime
            ? new Date(currentUser.metadata.creationTime).toLocaleDateString()
            : 'Not available';

        // Calculate member days
        let memberDays = 0;
        if (currentUser.metadata?.creationTime) {
            const creationDate = new Date(currentUser.metadata.creationTime);
            const today = new Date();
            memberDays = Math.floor((today - creationDate) / (1000 * 60 * 60 * 24));
        }

        // Update all name elements safely (only if they exist)
        const nameElements = ['user-name', 'user-name-menu', 'user-name-info', 'profile-name', 'profile-modal-name'];
        nameElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = displayName;
            }
        });

        // Update all email elements safely
        const emailElements = {
            'user-email': email,
            'profile-email': email,
            'profile-modal-email': emailHandle
        };
        Object.entries(emailElements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = value;
            }
        });

        // Update date elements safely
        const dateElements = {
            'user-joined': joinedDate,
            'member-days': memberDays.toString()
        };
        Object.entries(dateElements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = value;
            }
        });

        // Fetch additional user data from database
        fetchUserData(currentUser.uid);
        
        // Load user's profile with follower counts
        loadUserProfile(currentUser.uid);
        
        // Load trending hashtags
        loadTrendingTags();
        
        // AUTO-LOAD HOME FEED on page load
        loadSmartFeed();
        
        // Refresh trending tags every 30 seconds
        if (!window.trendingRefreshInterval) {
            window.trendingRefreshInterval = setInterval(loadTrendingTags, 30000);
        }
        
        // Auto-refresh feed every 60 seconds for new posts
        if (!window.feedRefreshInterval) {
            window.feedRefreshInterval = setInterval(() => {
                // Only refresh if user is on home feed
                const activeNav = document.querySelector('.nav-item.active');
                if (activeNav && activeNav.textContent.includes('Home')) {
                    loadSmartFeed();
                }
            }, 60000);
        }
    }
}

/**
 * Load user profile with followers/following/posts
 */
function loadUserProfile(uid) {
    database.ref('users/' + uid).once('value', (snapshot) => {
        if (snapshot.exists()) {
            userProfile = snapshot.val();
            console.log('User profile loaded:', userProfile);
        }
    });

    // Get follower count
    database.ref('followers/' + uid).once('value', (snapshot) => {
        const followers = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        const followersEl = document.getElementById('user-followers');
        if (followersEl) {
            followersEl.textContent = followers;
        }
    });

    // Get following count
    database.ref('following/' + uid).once('value', (snapshot) => {
        const following = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        const followingEl = document.getElementById('user-following');
        if (followingEl) {
            followingEl.textContent = following;
        }
    });

    // Get posts count
    database.ref('posts').orderByChild('authorId').equalTo(uid).once('value', (snapshot) => {
        const posts = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        const postsEl = document.getElementById('user-posts');
        if (postsEl) {
            postsEl.textContent = posts;
        }
    });
}

/**
 * Fetch user data from Firebase Realtime Database
 */
function fetchUserData(uid) {
    database.ref('users/' + uid).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                console.log('User data retrieved:', userData);
            }
        })
        .catch((error) => {
            console.error('Error fetching user data:', error);
        });
}

/**
 * Logout user from Firebase
 */
function logout() {
    auth.signOut()
        .then(() => {
            currentUser = null;
            console.log('User logged out');

            // Clear all forms
            document.getElementById('login-form').reset();
            document.getElementById('signup-form').reset();

            // Switch to login page
            switchPage('login-page');
        })
        .catch((error) => {
            console.error('Logout error:', error);
            alert('Error logging out: ' + error.message);
        });
}

/**
 * Edit Profile (Placeholder - will use Firebase later)
 */
function editProfile() {
    if (currentUser) {
        const newName = prompt('Enter your new name:', currentUser.displayName || '');
        if (newName && newName.trim()) {
            currentUser.updateProfile({
                displayName: newName
            })
                .then(() => {
                    // Update in database
                    return database.ref('users/' + currentUser.uid + '/name').set(newName);
                })
                .then(() => {
                    alert('Profile updated successfully!');
                    displayUserInfo();
                })
                .catch((error) => {
                    console.error('Error updating profile:', error);
                    alert('Error updating profile: ' + error.message);
                });
        }
    }
}

/**
 * Change Password (Placeholder - will use Firebase later)
 */
function changePassword() {
    if (currentUser) {
        const newPassword = prompt('Enter your new password (min 6 characters):');
        if (newPassword && newPassword.length >= 6) {
            currentUser.updatePassword(newPassword)
                .then(() => {
                    alert('Password changed successfully!');
                })
                .catch((error) => {
                    console.error('Error changing password:', error);
                    alert('Error changing password: ' + error.message);
                });
        } else if (newPassword) {
            alert('Password must be at least 6 characters long!');
        }
    }
}

/**
 * Toggle user dropdown menu
 */
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('show');
}

/**
 * Toggle notifications
 */
function toggleNotifications() {
    alert('Notifications coming soon!');
}

/**
 * Toggle dark/light theme
 */
function toggleTheme(e) {
    if (e && e.target) {
        // Called from checkbox change event
        if (e.target.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    } else {
        // Called from onclick
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        const toggle = document.getElementById('dark-mode-toggle');
        if (toggle) {
            toggle.checked = document.body.classList.contains('dark-mode');
        }
    }
}

/**
 * View Profile
 */
function viewProfile() {
    const modal = document.getElementById('profile-modal');
    modal.classList.add('show');
    displayProfileInfo();
}

/**
 * Close Profile Modal
 */
function closeProfile() {
    const modal = document.getElementById('profile-modal');
    modal.classList.remove('show');
}

/**
 * Display Profile Information
 */
function displayProfileInfo() {
    if (currentUser) {
        const displayName = currentUser.displayName || 'User';
        document.getElementById('profile-modal-name').textContent = displayName;
        document.getElementById('profile-modal-email').textContent = '@' + currentUser.email.split('@')[0];
    }
}

/**
 * Open Settings
 */
function openSettings() {
    const modal = document.getElementById('settings-modal');
    modal.classList.add('show');
}

/**
 * Close Settings
 */
function closeSettings() {
    const modal = document.getElementById('settings-modal');
    modal.classList.remove('show');
}

/**
 * Switch Feed View - Loads real posts from Firebase
 */
function switchFeed(type) {
    const feedContent = document.getElementById('feed-content');
    const feedTitle = document.getElementById('feed-title');
    if (!feedContent) return;

    // Update active menu item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Update mobile nav active state
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Mark the clicked item as active
    if (event && event.target && typeof event.target.closest === 'function') {
        const navItem = event.target.closest('.nav-item');
        const mobileNavItem = event.target.closest('.mobile-nav-item');
        
        if (navItem) {
            navItem.classList.add('active');
        }
        if (mobileNavItem) {
            mobileNavItem.classList.add('active');
        }
    } else {
        // If not from event, set active by type
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
        mobileNavItems.forEach((item, index) => {
            const itemText = item.textContent.toLowerCase().trim();
            if ((type === 'home' && itemText.includes('home')) ||
                (type === 'explore' && itemText.includes('explore')) ||
                (type === 'bookmarks' && itemText.includes('saved'))) {
                item.classList.add('active');
            }
        });
    }

    // Update feed title
    if (feedTitle) {
        switch(type) {
            case 'home':
                feedTitle.textContent = 'Home';
                loadSmartFeed();
                break;
            case 'explore':
                feedTitle.textContent = 'Explore';
                loadExploreFeed();
                break;
            case 'messages':
                feedTitle.textContent = 'Messages';
                feedContent.innerHTML = `<div class="empty-feed"><p>💬 No messages yet. Start a conversation!</p></div>`;
                break;
            case 'notifications':
                feedTitle.textContent = 'Notifications';
                loadNotifications();
                break;
            case 'bookmarks':
                feedTitle.textContent = 'Bookmarks';
                loadBookmarks();
                break;
            default:
                feedTitle.textContent = 'Home';
                loadSmartFeed();
        }
    }
}

/**
 * Load home feed with all posts
 */
/**
 * Smart Feed Algorithm - Loads personalized feed based on:
 * 1. Posts from people you follow
 * 2. Popular posts (liked by many people)
 * 3. Recent posts from anyone (if not following anyone yet)
 */
function loadSmartFeed() {
    const feedContent = document.getElementById('feed-content');
    feedContent.innerHTML = '<div style="text-align: center; padding: 20px;"><p>Loading your personalized feed...</p></div>';

    // First, get user's following list
    database.ref('following/' + currentUser.uid).once('value', (followingSnap) => {
        const followingList = followingSnap.exists() ? Object.keys(followingSnap.val()) : [];
        
        // Load all posts
        database.ref('posts').orderByChild('timestamp').limitToLast(100).once('value', (snapshot) => {
            if (!snapshot.exists()) {
                feedContent.innerHTML = '<div class="empty-feed"><p>📝 No posts yet. Be the first to post!</p></div>';
                return;
            }

            const allPosts = [];
            snapshot.forEach((postSnap) => {
                allPosts.push(postSnap.val());
            });

            // Score posts based on algorithm
            const scoredPosts = allPosts.map(post => {
                let score = 0;
                
                // 1. Post from following (high priority)
                if (followingList.includes(post.authorId)) {
                    score += 100;
                }
                
                // 2. Own posts (always show)
                if (post.authorId === currentUser.uid) {
                    score += 200;
                }
                
                // 3. Posts with likes (engagement)
                const likeCount = post.likes ? Object.keys(post.likes).length : 0;
                score += likeCount * 5;
                
                // 4. Posts with comments (very engaging)
                const commentCount = post.comments ? Object.keys(post.comments).length : 0;
                score += commentCount * 15;
                
                // 5. Posts with retweets (popular)
                const retweetCount = post.retweets ? Object.keys(post.retweets).length : 0;
                score += retweetCount * 8;
                
                // 6. Recency bonus (newer posts score higher)
                const postDate = new Date(post.timestamp);
                const now = new Date();
                const hoursDiff = (now - postDate) / (1000 * 60 * 60);
                const recencyBonus = Math.max(0, 50 - (hoursDiff * 2)); // Decreases over time
                score += recencyBonus;
                
                // 7. Hashtag posts get small boost (community engagement)
                if (post.hashtags && post.hashtags.length > 0) {
                    score += post.hashtags.length * 2;
                }
                
                return { post, score };
            });

            // Sort by score (highest first)
            scoredPosts.sort((a, b) => b.score - a.score);

            // Get top posts
            const topPosts = scoredPosts.slice(0, 30).map(item => item.post);

            if (topPosts.length === 0) {
                feedContent.innerHTML = '<div class="empty-feed"><p>📝 No posts yet. Be the first to post!</p></div>';
                return;
            }

            feedContent.innerHTML = '';
            topPosts.forEach(post => {
                feedContent.appendChild(createPostElement(post));
            });
            
            console.log('Smart feed loaded with', topPosts.length, 'posts');
        }).catch(err => {
            console.error('Error loading smart feed:', err);
            feedContent.innerHTML = '<div class="empty-feed"><p>Error loading posts. Try refreshing.</p></div>';
        });
    }).catch(err => {
        console.error('Error loading following list:', err);
        // Fallback to regular home feed if error
        loadHomeFeed();
    });
}

/**
 * Load home feed (all posts, newest first)
 */
function loadHomeFeed() {

    const feedContent = document.getElementById('feed-content');
    feedContent.innerHTML = '<div style="text-align: center; padding: 20px;"><p>Loading posts...</p></div>';

    database.ref('posts').orderByChild('timestamp').limitToLast(50).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const posts = [];
            snapshot.forEach((postSnap) => {
                posts.unshift(postSnap.val()); // Reverse order for newest first
            });
            
            if (posts.length === 0) {
                feedContent.innerHTML = '<div class="empty-feed"><p>📝 No posts yet. Be the first to post!</p></div>';
            } else {
                feedContent.innerHTML = '';
                posts.forEach(post => {
                    feedContent.appendChild(createPostElement(post));
                });
            }
        } else {
            feedContent.innerHTML = '<div class="empty-feed"><p>📝 No posts yet. Be the first to post!</p></div>';
        }
    }).catch(err => {
        console.error('Error loading feed:', err);
        feedContent.innerHTML = '<div class="empty-feed"><p>Error loading posts. Try refreshing.</p></div>';
    });
}

/**
 * Load explore feed (popular posts)
 */
function loadExploreFeed() {
    const feedContent = document.getElementById('feed-content');
    feedContent.innerHTML = '<div style="text-align: center; padding: 20px;"><p>Loading trending posts...</p></div>';

    database.ref('posts').orderByChild('likes').limitToLast(20).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const posts = [];
            snapshot.forEach((postSnap) => {
                posts.unshift(postSnap.val());
            });
            
            feedContent.innerHTML = '';
            posts.forEach(post => {
                feedContent.appendChild(createPostElement(post));
            });
        } else {
            feedContent.innerHTML = '<div class="empty-feed"><p>🔍 No trending posts yet.</p></div>';
        }
    }).catch(err => {
        console.error('Error loading explore:', err);
        feedContent.innerHTML = '<div class="empty-feed"><p>Error loading posts.</p></div>';
    });
}

/**
 * Load notifications
 */
function loadNotifications() {
    const feedContent = document.getElementById('feed-content');
    feedContent.innerHTML = '<div class="empty-feed"><p>🔔 No notifications yet. When someone likes or comments on your posts, you\'ll see it here.</p></div>';
}

/**
 * Load bookmarked posts
 */
function loadBookmarks() {
    const feedContent = document.getElementById('feed-content');
    if (!currentUser) return;

    feedContent.innerHTML = '<div style="text-align: center; padding: 20px;"><p>Loading bookmarks...</p></div>';

    database.ref('bookmarks/' + currentUser.uid).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const bookmarkIds = snapshot.val();
            feedContent.innerHTML = '';
            
            Object.keys(bookmarkIds).forEach(postId => {
                database.ref('posts/' + postId).once('value', (postSnap) => {
                    if (postSnap.exists()) {
                        feedContent.appendChild(createPostElement(postSnap.val()));
                    }
                });
            });
        } else {
            feedContent.innerHTML = '<div class="empty-feed"><p>🔖 No bookmarked posts yet. Save posts to your bookmarks!</p></div>';
        }
    }).catch(err => {
        console.error('Error loading bookmarks:', err);
        feedContent.innerHTML = '<div class="empty-feed"><p>Error loading bookmarks.</p></div>';
    });
}

/**
 * Load trending hashtags and display them
 */
/**
 * Format number for trending display (e.g., 1200 becomes "1.2K")
 */
function formatTrendingCount(count) {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
}

/**
 * Get trending rank/label for count
 */
function getTrendingLabel(index, count) {
    if (index === 0) return 'Trending Worldwide';
    if (count >= 1000) return 'Technology · Trending';
    if (count >= 100) return 'Trending in Your Network';
    return 'Trending';
}

/**
 * Load trending hashtags and display them with algorithm-based ranking
 */
function loadTrendingTags() {
    const trendingContainer = document.querySelector('.trending-list');
    if (!trendingContainer) return;

    database.ref('hashtags').once('value', (snapshot) => {
        if (!snapshot.exists()) {
            trendingContainer.innerHTML = '<div style="padding: 15px; text-align: center; color: var(--text-secondary);">📊 No trending tags yet. Start using hashtags!</div>';
            return;
        }

        const hashtags = snapshot.val();
        
        // Trending algorithm: Sort by post count, more recent activity gets slight boost
        const trendingArray = Object.entries(hashtags)
            .map(([tag, data]) => {
                const count = data.count || 0;
                const postIds = Object.keys(data.posts || {});
                
                // Calculate engagement score (posts per hashtag)
                const engagementScore = count * 1.5; // Weight by post count
                
                return {
                    tag: tag,
                    count: count,
                    postIds: postIds,
                    score: engagementScore,
                    rank: 0
                };
            })
            .sort((a, b) => b.score - a.score) // Sort by trending score
            .slice(0, 4) // Show top 4 trending
            .map((item, index) => {
                item.rank = index + 1;
                return item;
            });

        if (trendingArray.length === 0) {
            trendingContainer.innerHTML = '<div style="padding: 15px; text-align: center; color: var(--text-secondary);">📊 No trending tags yet. Start using hashtags!</div>';
            return;
        }

        // Generate trending HTML with ranking
        trendingContainer.innerHTML = trendingArray.map((item) => {
            const label = getTrendingLabel(item.rank - 1, item.count);
            const formattedCount = formatTrendingCount(item.count);
            const totalPosts = item.count === 1 ? 'post' : 'posts';
            
            return `
                <a href="#" onclick="loadHashtagFeed('${item.tag}'); return false;" class="trending-item" style="cursor: pointer; transition: all 0.2s ease;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                        <div style="flex: 1;">
                            <div style="font-size: 0.8em; color: var(--text-secondary); margin-bottom: 4px; font-weight: 500;">${label}</div>
                            <div class="trending-name">#${item.tag}</div>
                            <div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 4px;">${item.count} ${totalPosts}</div>
                        </div>
                        <div style="text-align: right; padding-left: 10px; font-size: 1.1em; color: var(--primary); font-weight: bold; opacity: 0.5;">
                            #${item.rank}
                        </div>
                    </div>
                </a>
            `;
        }).join('');
        
        console.log('Trending tags loaded:', trendingArray.length);
    });
}


/**
 * Load posts for a specific hashtag
 */
/**
 * Load posts for a specific hashtag with trending info
 */
function loadHashtagFeed(hashtag) {
    switchFeed('home'); // Switch to home view
    const feedContent = document.getElementById('feed-content');
    const feedHeader = document.querySelector('.feed-header h2');
    
    // Update feed header to show hashtag being viewed
    if (feedHeader) {
        feedHeader.innerHTML = '🏷️ #' + hashtag;
    }
    
    feedContent.innerHTML = '<div style="text-align: center; padding: 30px;"><p style="color: var(--text-secondary);">🔍 Loading posts with #' + hashtag + '...</p></div>';

    database.ref('posts').orderByChild('timestamp').once('value', (snapshot) => {
        if (!snapshot.exists()) {
            feedContent.innerHTML = '<div class="empty-feed"><p>📭 No posts found with #' + hashtag + '</p></div>';
            return;
        }

        const posts = [];
        snapshot.forEach((childSnapshot) => {
            const post = childSnapshot.val();
            if (post.hashtags && post.hashtags.includes('#' + hashtag.toLowerCase())) {
                posts.push(post);
            }
        });

        posts.reverse(); // Newest first

        if (posts.length === 0) {
            feedContent.innerHTML = '<div class="empty-feed"><p>📭 No posts found with #' + hashtag + '</p></div>';
            return;
        }

        // Clear and add header with count
        feedContent.innerHTML = `
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--border); margin-bottom: 12px;">
                <div style="font-size: 0.9em; color: var(--text-secondary);">📊 Showing ${posts.length} ${posts.length === 1 ? 'post' : 'posts'} with #${hashtag}</div>
            </div>
        `;
        
        posts.forEach(post => {
            feedContent.appendChild(createPostElement(post));
        });
    });
}


/**
 * Format post content with clickable hashtags
 */
function formatPostContent(content) {
    // Escape HTML first
    let text = escapeHtml(content);
    // Replace hashtags with clickable links
    text = text.replace(/#[a-zA-Z0-9_]+/g, (tag) => {
        const tagName = tag.substring(1).toLowerCase();
        return `<a href="#" onclick="loadHashtagFeed('${tagName}'); return false;" style="color: var(--primary); text-decoration: none; cursor: pointer; font-weight: 500;">${tag}</a>`;
    });
    return text;
}

/**
 * Create a post element with all interactive features
 */

function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.id = 'post-' + post.postId;

    const authorHandle = post.authorEmail.split('@')[0];
    const likeCount = post.likes ? Object.keys(post.likes).length : 0;
    const commentCount = post.comments ? Object.keys(post.comments).length : 0;
    const retweetCount = post.retweets ? Object.keys(post.retweets).length : 0;
    const isLiked = post.likes && post.likes[currentUser.uid] ? true : false;
    const isBookmarked = userProfile.bookmarks && userProfile.bookmarks[post.postId] ? true : false;

    // Format timestamp
    const postTime = formatTime(post.timestamp);

    postDiv.innerHTML = `
        <div class="post-header">
            <div class="post-author">
                <div class="post-avatar">👤</div>
                <div class="post-info">
                    <div class="post-name">${post.authorName}</div>
                    <div class="post-handle">@${authorHandle} • ${postTime}</div>
                </div>
            </div>
            ${post.authorId === currentUser.uid ? `<div style="position: relative;"><button class="post-menu" data-postid="${post.postId}" title="Menu">⋯</button><div class="post-menu-dropdown" id="menu-${post.postId}" style="display: none;"><button class="menu-option" onclick="editPost('${post.postId}')">✏️ Edit</button><button class="menu-option delete" onclick="confirmDeletePost('${post.postId}')">🗑️ Delete</button></div></div>` : ''}
        </div>
        <div class="post-content">${formatPostContent(post.content)}</div>
        <div class="post-stats">
            <span>${retweetCount} Retweets</span>
            <span>${likeCount} Likes</span>
            <span>${commentCount} Comments</span>
        </div>
        <div class="post-actions">
            <button class="post-action" onclick="toggleLike('${post.postId}')" title="Like">
                ${isLiked ? '❤️' : '🤍'} ${likeCount}
            </button>
            <button class="post-action" onclick="openComments('${post.postId}')" title="Comment">
                💬 ${commentCount}
            </button>
            <button class="post-action" onclick="toggleRetweet('${post.postId}')" title="Retweet">
                🔄 ${retweetCount}
            </button>
            <button class="post-action" onclick="toggleBookmark('${post.postId}')" title="Bookmark">
                ${isBookmarked ? '🔖' : '📌'} 
            </button>
        </div>
        <div class="post-comments-section" id="comments-${post.postId}" style="display:none;">
            <div class="comments-list" id="comments-list-${post.postId}"></div>
            <div class="comment-composer">
                <input type="text" class="comment-input" id="comment-input-${post.postId}" placeholder="Add a comment...">
                <button onclick="submitComment('${post.postId}')" class="btn-comment">Post</button>
            </div>
        </div>
    `;

    return postDiv;
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp) {
    if (!timestamp) return 'now';
    
    const postDate = new Date(timestamp);
    const now = new Date();
    const diff = now - postDate;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return postDate.toLocaleDateString();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Toggle like on a post
 */
function toggleLike(postId) {
    if (!currentUser) {
        alert('Please sign in first');
        return;
    }

    database.ref('posts/' + postId + '/likes/' + currentUser.uid).once('value', (snapshot) => {
        if (snapshot.exists()) {
            // Unlike
            database.ref('posts/' + postId + '/likes/' + currentUser.uid).remove();
        } else {
            // Like
            database.ref('posts/' + postId + '/likes/' + currentUser.uid).set(true);
        }
        // Refresh the feed after a short delay
        setTimeout(() => {
            loadHomeFeed();
        }, 200);
    });
}

/**
 * Toggle retweet on a post
 */
function toggleRetweet(postId) {
    if (!currentUser) {
        alert('Please sign in first');
        return;
    }

    database.ref('posts/' + postId + '/retweets/' + currentUser.uid).once('value', (snapshot) => {
        if (snapshot.exists()) {
            database.ref('posts/' + postId + '/retweets/' + currentUser.uid).remove();
        } else {
            database.ref('posts/' + postId + '/retweets/' + currentUser.uid).set(true);
        }
        setTimeout(() => {
            loadHomeFeed();
        }, 200);
    });
}

/**
 * Toggle bookmark on a post
 */
function toggleBookmark(postId) {
    if (!currentUser) {
        alert('Please sign in first');
        return;
    }

    database.ref('bookmarks/' + currentUser.uid + '/' + postId).once('value', (snapshot) => {
        if (snapshot.exists()) {
            database.ref('bookmarks/' + currentUser.uid + '/' + postId).remove();
        } else {
            database.ref('bookmarks/' + currentUser.uid + '/' + postId).set(true);
        }
    });
}

/**
 * Open comments section
 */
function openComments(postId) {
    const commentSection = document.getElementById('comments-' + postId);
    if (commentSection.style.display === 'none') {
        commentSection.style.display = 'block';
        loadComments(postId);
        document.getElementById('comment-input-' + postId).focus();
    } else {
        commentSection.style.display = 'none';
    }
}

/**
 * Load comments for a post
 */
function loadComments(postId) {
    database.ref('posts/' + postId + '/comments').once('value', (snapshot) => {
        const commentsList = document.getElementById('comments-list-' + postId);
        commentsList.innerHTML = '';

        if (snapshot.exists()) {
            const comments = snapshot.val();
            Object.keys(comments).forEach(commentId => {
                const comment = comments[commentId];
                const commentEl = document.createElement('div');
                commentEl.className = 'comment-item';
                commentEl.innerHTML = `
                    <div class="comment-author">
                        <strong>${comment.authorName}</strong>
                        <span class="comment-time">${formatTime(comment.timestamp)}</span>
                    </div>
                    <div class="comment-text">${escapeHtml(comment.text)}</div>
                `;
                commentsList.appendChild(commentEl);
            });
        }
    });
}

/**
 * Submit a comment on a post
 */
function submitComment(postId) {
    if (!currentUser) {
        alert('Please sign in first');
        return;
    }

    const input = document.getElementById('comment-input-' + postId);
    const text = input.value.trim();

    if (!text) {
        alert('Please enter a comment');
        return;
    }

    const commentId = database.ref().push().key;
    const comment = {
        commentId: commentId,
        postId: postId,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Anonymous',
        authorEmail: currentUser.email,
        text: text,
        timestamp: new Date().toISOString(),
        likes: {}
    };

    database.ref('posts/' + postId + '/comments/' + commentId).set(comment).then(() => {
        input.value = '';
        loadComments(postId);
    }).catch(err => console.error('Error posting comment:', err));
}

/**
 * Delete a post (only author can delete)
 */
function deletePost(postId) {
    if (!currentUser) {
        alert('Please sign in first');
        return;
    }

    // Verify ownership before deleting
    database.ref('posts/' + postId).once('value').then(snapshot => {
        if (!snapshot.exists()) {
            alert('Post not found');
            return;
        }

        const post = snapshot.val();
        if (post.authorId !== currentUser.uid) {
            alert('You can only delete your own posts');
            return;
        }

        // Actually remove the post
        database.ref('posts/' + postId).remove().then(() => {
            alert('Post deleted');
            switchFeed('home');
        }).catch(err => console.error('Error deleting post:', err));
    }).catch(err => {
        console.error('Error verifying post ownership:', err);
        alert('Error deleting post');
    });
}

/**
 * Toggle the post menu dropdown (three-dots menu)
 */
function togglePostMenu(postId) {
    const menuId = 'menu-' + postId;
    const menu = document.getElementById(menuId);
    if (!menu) return;

    // Close any other open menus first
    document.querySelectorAll('.post-menu-dropdown').forEach(m => {
        if (m.id !== menuId) m.style.display = 'none';
    });

    // Toggle this menu
    if (menu.style.display === 'block') {
        menu.style.display = 'none';
    } else {
        menu.style.display = 'block';
    }
}

/**
 * Confirm deletion flow for a post (shows prompt then calls delete)
 */
function confirmDeletePost(postId) {
    const ok = confirm('Delete this post? This cannot be undone.');
    if (ok) {
        deletePost(postId);
    }
}

/**
 * Edit a post's content in-place (simple prompt editor)
 */
function editPost(postId) {
    if (!currentUser) {
        alert('Please sign in first');
        return;
    }

    // Load current post content
    database.ref('posts/' + postId).once('value').then(snapshot => {
        if (!snapshot.exists()) {
            alert('Post not found');
            return;
        }

        const post = snapshot.val();
        if (post.authorId !== currentUser.uid) {
            alert('You can only edit your own posts');
            return;
        }

        const newContent = prompt('Edit your post:', post.content);
        if (newContent === null) return; // user cancelled

        const trimmed = newContent.trim();
        if (!trimmed) {
            alert('Post content cannot be empty');
            return;
        }

        const oldHashtags = post.hashtags || [];
        const newHashtags = extractHashtags(trimmed);

        // Update post content and hashtags
        database.ref('posts/' + postId).update({ content: trimmed, hashtags: newHashtags }).then(() => {
            // Update hashtags index: decrement old, increment new
            // Decrement counts for tags removed
            oldHashtags.forEach(tag => {
                if (!newHashtags.includes(tag)) {
                    const tagName = tag.substring(1);
                    database.ref('hashtags/' + tagName).once('value').then(snap => {
                        if (snap.exists()) {
                            const data = snap.val();
                            data.count = Math.max(0, (data.count || 1) - 1);
                            if (data.posts) delete data.posts[postId];
                            database.ref('hashtags/' + tagName).set(data);
                        }
                    });
                }
            });

            // Increment counts for new tags added
            newHashtags.forEach(tag => {
                if (!oldHashtags.includes(tag)) {
                    const tagName = tag.substring(1);
                    database.ref('hashtags/' + tagName).once('value').then(snap => {
                        const current = snap.val() || { count: 0, posts: {} };
                        current.count = (current.count || 0) + 1;
                        current.posts = current.posts || {};
                        current.posts[postId] = true;
                        database.ref('hashtags/' + tagName).set(current);
                    });
                }
            });

            alert('Post updated');
            // Close menu and refresh feed
            const menu = document.getElementById('menu-' + postId);
            if (menu) menu.style.display = 'none';
            switchFeed('home');
            loadTrendingTags();
        }).catch(err => {
            console.error('Error updating post:', err);
            alert('Error updating post');
        });
    }).catch(err => {
        console.error('Error loading post for edit:', err);
        alert('Error loading post');
    });
}

// Close post menus when clicking outside (safe against text-node targets)
document.addEventListener('click', (e) => {
    let el = e.target;
    // If the target is a text node, climb to its parent element
    while (el && el.nodeType !== 1) {
        el = el.parentNode;
    }
    if (!el) return;

    if (!el.closest('.post-menu') && !el.closest('.post-menu-dropdown')) {
        document.querySelectorAll('.post-menu-dropdown').forEach(m => m.style.display = 'none');
    }
});

// Delegated handler so dynamically-created post-menu buttons always work
document.addEventListener('click', (e) => {
    let el = e.target;
    while (el && el.nodeType !== 1) el = el.parentNode;
    if (!el) return;

    const menuBtn = el.closest('.post-menu');
    if (menuBtn) {
        // Find enclosing post element to extract postId
        const postEl = menuBtn.closest('.post');
        if (!postEl || !postEl.id) return;
        const idParts = postEl.id.split('-');
        const postId = idParts.slice(1).join('-');
        if (!postId) return;

        // Prevent the outside click handler from immediately closing it
        e.stopPropagation();

        // Toggle menu
        togglePostMenu(postId);
    }
});

/**
 * Create a new post - Saves to Firebase
 */
/**
 * Extract hashtags from text
 */
function extractHashtags(text) {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const matches = text.match(hashtagRegex) || [];
    return [...new Set(matches.map(tag => tag.toLowerCase()))];
}

/**
 * Create post with hashtag tracking
 */
function createPost() {
    const postTextEl = document.getElementById('post-text');
    if (!postTextEl) {
        console.error('Post text element not found');
        return;
    }
    
    const postText = postTextEl.value.trim();
    
    if (!postText) {
        alert('Please write something!');
        return;
    }

    if (!currentUser) {
        alert('Please log in first!');
        return;
    }

    // Extract hashtags from post
    const hashtags = extractHashtags(postText);
    
    // Create post in Firebase
    const postId = database.ref().push().key;
    const post = {
        postId: postId,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Anonymous',
        authorEmail: currentUser.email,
        content: postText,
        timestamp: new Date().toISOString(),
        hashtags: hashtags,
        likes: {},
        comments: {},
        retweets: {}
    };

    database.ref('posts/' + postId).set(post).then(() => {
        console.log('Post created:', postId);
        postTextEl.value = '';
        
        // Update hashtag counts
        hashtags.forEach(tag => {
            const tagName = tag.substring(1); // Remove # symbol
            database.ref('hashtags/' + tagName).once('value', (snapshot) => {
                const current = snapshot.val() || { count: 0, posts: {} };
                current.count = (current.count || 0) + 1;
                current.posts = current.posts || {};
                current.posts[postId] = true;
                database.ref('hashtags/' + tagName).set(current);
            });
        });
        
        alert('Post created successfully! 🎉');
        
        // Refresh feed and trending
        switchFeed('home');
        loadTrendingTags();
    }).catch((error) => {
        console.error('Error creating post:', error);
        alert('Error creating post. Try again.');
    });
}

/**
 * Delete account
 */
function deleteAccount() {
    const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone.');
    if (confirmed) {
        const userConfirmed = prompt('Type your email to confirm deletion:');
        if (userConfirmed === currentUser.email) {
            if (currentUser) {
                currentUser.delete()
                    .then(() => {
                        alert('Account deleted successfully.');
                        logout();
                    })
                    .catch((error) => {
                        console.error('Error deleting account:', error);
                        alert('Error deleting account. You may need to sign in again.');
                    });
            }
        } else {
            alert('Email does not match. Deletion cancelled.');
        }
    }
}

/**
 * Update Profile
 */
function updateProfile() {
    const settingNameEl = document.getElementById('setting-name');
    if (!settingNameEl) {
        console.error('Setting name input not found');
        return;
    }

    const newName = settingNameEl.value;
    if (newName && currentUser) {
        currentUser.updateProfile({
            displayName: newName
        })
            .then(() => {
                alert('Profile updated successfully!');
                displayUserInfo();
                closeSettings();
            })
            .catch((error) => {
                console.error('Error updating profile:', error);
                alert('Error updating profile: ' + error.message);
            });
    } else {
        alert('Please enter a name!');
    }
}

// ============== FOLLOWER/FOLLOWING SYSTEM ==============

/**
 * Follow a user
 */
function followUser(userId) {
    if (!currentUser) {
        alert('Please sign in first');
        return;
    }

    if (userId === currentUser.uid) {
        alert('You cannot follow yourself');
        return;
    }

    // Add to current user's following list
    database.ref('following/' + currentUser.uid + '/' + userId).set(true);
    
    // Add to target user's followers list
    database.ref('followers/' + userId + '/' + currentUser.uid).set(true);

    alert('Following user!');
    loadUserProfile(currentUser.uid);
}

/**
 * Unfollow a user
 */
function unfollowUser(userId) {
    if (!currentUser) {
        alert('Please sign in first');
        return;
    }

    // Remove from current user's following list
    database.ref('following/' + currentUser.uid + '/' + userId).remove();
    
    // Remove from target user's followers list
    database.ref('followers/' + userId + '/' + currentUser.uid).remove();

    alert('Unfollowed user');
    loadUserProfile(currentUser.uid);
}

/**
 * Check if current user follows a user
 */
function isFollowing(userId) {
    if (!currentUser) return false;
    
    let following = false;
    database.ref('following/' + currentUser.uid + '/' + userId).once('value', (snapshot) => {
        following = snapshot.exists();
    });
    
    return following;
}

/**
 * Block a user
 */
function blockUser(userId) {
    if (!currentUser) {
        alert('Please sign in first');
        return;
    }

    const confirmed = confirm('Are you sure you want to block this user?');
    if (!confirmed) return;

    database.ref('blocked/' + currentUser.uid + '/' + userId).set(true);
    
    // Also remove from following if blocking
    unfollowUser(userId);
    
    alert('User blocked');
}

/**
 * Unblock a user
 */
function unblockUser(userId) {
    if (!currentUser) {
        alert('Please sign in first');
        return;
    }

    database.ref('blocked/' + currentUser.uid + '/' + userId).remove();
    alert('User unblocked');
}

/**
 * Check if user is blocked
 */
function isUserBlocked(userId) {
    if (!currentUser) return false;
    
    let blocked = false;
    database.ref('blocked/' + currentUser.uid + '/' + userId).once('value', (snapshot) => {
        blocked = snapshot.exists();
    });
    
    return blocked;
}

/**
 * Get user's followers
 */
function getUserFollowers(userId, callback) {
    database.ref('followers/' + userId).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const followers = Object.keys(snapshot.val());
            callback(followers);
        } else {
            callback([]);
        }
    });
}

/**
 * Get user's following list
 */
function getUserFollowing(userId, callback) {
    database.ref('following/' + userId).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const following = Object.keys(snapshot.val());
            callback(following);
        } else {
            callback([]);
        }
    });
}

/**
 * Get user's posts
 */
function getUserPosts(userId, callback) {
    database.ref('posts').orderByChild('authorId').equalTo(userId).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const posts = [];
            snapshot.forEach((postSnap) => {
                posts.push(postSnap.val());
            });
            callback(posts);
        } else {
            callback([]);
        }
    });
}

/**
 * View another user's profile
 */
function viewUserProfile(userId) {
    if (!currentUser) {
        alert('Please sign in first');
        return;
    }

    // Load user data
    database.ref('users/' + userId).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const user = snapshot.val();
            
            // Get follower count
            database.ref('followers/' + userId).once('value', (followerSnap) => {
                const followers = followerSnap.exists() ? Object.keys(followerSnap.val()).length : 0;
                
                // Get following count
                database.ref('following/' + userId).once('value', (followingSnap) => {
                    const following = followingSnap.exists() ? Object.keys(followingSnap.val()).length : 0;
                    
                    // Get posts count
                    database.ref('posts').orderByChild('authorId').equalTo(userId).once('value', (postsSnap) => {
                        const posts = postsSnap.exists() ? Object.keys(postsSnap.val()).length : 0;
                        
                        // Check if following
                        database.ref('following/' + currentUser.uid + '/' + userId).once('value', (followSnap) => {
                            const isFollowingUser = followSnap.exists();
                            
                            // Display profile
                            alert(`
${user.name || 'User'}
@${user.email.split('@')[0]}

Followers: ${followers}
Following: ${following}
Posts: ${posts}

${isFollowingUser ? 'Following' : 'Not Following'}
                            `);
                        });
                    });
                });
            });
        } else {
            alert('User not found');
        }
    });
}
