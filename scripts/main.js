/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

// Shortcuts to DOM Elements.
var messageForm = document.getElementById('message-form');
var messageInput = document.getElementById('new-post-message');
var titleInput = document.getElementById('new-post-title');
var signInButton = document.getElementById('sign-in-button');
var signOutButton = document.getElementById('sign-out-button');
var splashPage = document.getElementById('page-splash');
var addPost = document.getElementById('add-post');
var addButton = document.getElementById('add');
var recentPostsSection = document.getElementById('recent-posts-list');
var userPostsSection = document.getElementById('user-posts-list');
var topUserPostsSection = document.getElementById('top-user-posts-list');
var recentMenuButton = document.getElementById('menu-recent');
var myPostsMenuButton = document.getElementById('menu-my-posts');
var myTopPostsMenuButton = document.getElementById('menu-my-top-posts');
var searchMovieButton = document.getElementById('load-movie-data')
var foundMovieSubmit = document.getElementById('found-movie-submit')

var listeningFirebaseRefs = [];

/**
 * Saves a new post to the Firebase DB.
 */
// [START write_fan_out]
function MovieSuggestion(uid, username, picture, title, body, dankness) {
  // A post entry.
  var postData = {
    author: username,
    uid: uid,
    body: body,
    title: title,
    moviePic: picture,
    dankness: dankness,
    watched: false,
    dank_calc: {numer:dankness, denom:1.0}
  };

  // Get a key for a new Post.
  var newPostKey = firebase.database().ref().child('posts').push().key;

  // Write the new post's data simultaneously in the posts list and the user's post list.
  var updates = {};
  updates['/posts/' + newPostKey] = postData;

  return firebase.database().ref().update(updates);
}
// [END write_fan_out]

/**
 * Star/unstar post.
 */
// [START post_stars_transaction]
function toggleVote(postRef, uid, vote, postElement) {
  var value_as_a_person = 0.5
  postRef.transaction(function(post) {
    if (post) {
      if (post.votes && post.votes[uid]) {
        if (post.votes[uid] !== vote)  {
          if (vote === "up") {

            console.log("we changed our vote to upvote");
            console.log("adding " + value_as_a_person + " to our numerator");
            console.log("previous numerator was", post.dank_calc.numer);

            post.dank_calc.numer += value_as_a_person

          } else {

            console.log("we changed our vote to downvote");
            console.log("subtracting " + value_as_a_person + " from our numerator");
            console.log("previous numerator was", post.dank_calc.numer);

            post.dank_calc.numer -= value_as_a_person
          }

          post.votes[uid] = vote;
        } else {
          console.log("we reclicked on the same vote, removing")
          if (vote == "up") {
            post.dank_calc.numer -= value_as_a_person
          }
          post.dank_calc.denom -= value_as_a_person
          delete post.votes[uid]

          postElement.getElementsByClassName('selected')[0].classList.remove('selected')
        }
      } else {
        if (!post.votes) {
          post.votes = {};
        }

        post.votes[uid] = vote;

        console.log("we created a new vote");
        console.log("adding " + value_as_a_person + " to our denom");
        console.log("previous denom was", post.dank_calc.denom);

        post.dank_calc.denom += value_as_a_person

        if (vote === "up") {

          console.log("adding " + value_as_a_person + " to our numerator");
          console.log("previous numerator was", post.dank_calc.numer);
          post.dank_calc.numer += value_as_a_person;

        }
      }
      post.dankness = post.dank_calc.numer / post.dank_calc.denom
    }
    return post;
  });
}
// [END post_stars_transaction]

/**
 * Creates a post element.
 */
function createPostElement(postId, title, text, author, authorId, moviePic, dankness, watched) {
  var uid = firebase.auth().currentUser.uid;

  var html =
      '<div class="post mdl-cell mdl-cell--12-col ' +
                  'mdl-cell--6-col-tablet mdl-cell--6-col-desktop mdl-grid mdl-grid--no-spacing" style="margin: 0 auto 20px">' +
        '<div class="mdl-card mdl-shadow--2dp">' +
          '<div class="mdl-card__title mdl-color--light-blue-600 mdl-color-text--white">' +
            '<h4 class="mdl-card__title-text"></h4>' +
          '</div>' +
          '<div><div class="header">' +
            '<div>' +
              '<img class="avatar"></img>' +
            '</div>' +
          '</div>' +
          '<span class="star">' +
            '<div class="downvote material-icons">expand_more</div>' +
            '<div class="upvote material-icons">expand_less</div>' +
          '</span>' +
          '<div class="text"></div>'+

          '<button href="http://google.com" type="button" class="mdl-button mdl-js-button mdl-color--blue-400 mdl-shadow--4dp mdl-js-ripple-effect add-to-survey">Agreed to Watch?</button>' +

          '<button href="http://google.com" type="button" class="mdl-button mdl-js-button mdl-color--amber-400 mdl-shadow--4dp mdl-js-ripple-effect resolve-dank">Resolve <em>Value As A Person</em>\'s</button>' +

          '</div>' +
          '<div class="comments-container" style="clear:both;"></div>' +
          '<form class="add-comment" action="#">' +
            '<div class="mdl-textfield mdl-js-textfield">' +
              '<input class="mdl-textfield__input new-comment" type="text">' +
              '<label class="mdl-textfield__label">Comment...</label>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';

  // Create the DOM element from the HTML.
  var div = document.createElement('div');
  div.innerHTML = html;
  var postElement = div.firstChild;
  postElement.id = postId;
  if (componentHandler) {
    componentHandler.upgradeElements(postElement.getElementsByClassName('mdl-textfield')[0]);
  }

  var addCommentForm = postElement.getElementsByClassName('add-comment')[0];
  var commentInput = postElement.getElementsByClassName('new-comment')[0];
  var upvote = postElement.getElementsByClassName('upvote')[0];
  var downvote = postElement.getElementsByClassName('downvote')[0];
  var addToSurvey = postElement.getElementsByClassName('add-to-survey')[0];
  var resolveDank = postElement.getElementsByClassName('resolve-dank')[0];

  addToSurvey.onclick = function () {
    alert("Great!\nBe sure to vote once you watch it and it appears in the Survey Queue")
    var globalPostRef = firebase.database().ref('/posts/' + postId);


      postElement.classList.add("watched")

    globalPostRef.transaction(function (post) {
      post.watched = true;
      post.dankNaught = post.dankness
      post.dankness = 0.5
      post.dank_calc = {numer:post.dankness, denom:1.0}
      post.pre_votes = JSON.parse(JSON.stringify(post.votes))
      post.votes = {}
      return post;
    })
  }

  resolveDank.onclick = function () {
    var globalPostRef = firebase.database().ref('/posts/' + postId);
    globalPostRef.transaction(function (post) {
      post.watched = true;
      post.dankFinal = post.dankness

      post.deltaDank = post.dankFinal - post.dankNaught;
      for (var user in post.pre_votes) {
        if (post.pre_votes.hasOwnProperty(user)) {
          console.log('users/' + user)
          var userPostRef = firebase.database().ref('/users/' + user);

          userPostRef.transaction(function (server_user) {
            if (!server_user) {console.log("bad user"); return;}

            if (!(server_user.value_as_a_person)) server_user.value_as_a_person = 0.5

            console.log(server_user.username, "went from", server_user.value_as_a_person);

            if (post.pre_votes[user] == 'up') {
              if (post.deltaDank > 0) {
                server_user.value_as_a_person += (1-server_user.value_as_a_person) * deltaDank
              } else {
                server_user.value_as_a_person *= 0.9
              }
            } else {
              if (post.deltaDank < 0) {
                server_user.value_as_a_person += (1-server_user.value_as_a_person) * -deltaDank
              } else {
                server_user.value_as_a_person *= 0.9
              }
            }
            console.log("to", server_user.value_as_a_person);
            return server_user
          })
        }
      }
      return post;
    })
  }



  // Set values.
  postElement.getElementsByClassName('text')[0].innerText = text;
  postElement.getElementsByClassName('mdl-card__title-text')[0].innerHTML = title +
                                                                ":<span class='dankness'>" + Math.round(dankness*100) + "%</span> Dank ";
  postElement.getElementsByClassName('avatar')[0].src = moviePic || './silhouette.jpg'

  // Listen for comments.
  // [START child_event_listener_recycler]
  var commentsRef = firebase.database().ref('post-comments/' + postId);
  commentsRef.on('child_added', function(data) {
    addCommentElement(postElement, data.key, data.val().text, data.val().author);
  });

  commentsRef.on('child_changed', function(data) {
    setCommentValues(postElement, data.key, data.val().text, data.val().author);
  });

  commentsRef.on('child_removed', function(data) {
    deleteComment(postElement, data.key);
  });
  // [END child_event_listener_recycler]

  // Listen for likes counts.
  // [START post_value_event_listener]
  // var starCountRef = firebase.database().ref('posts/' + postId + '/starCount');
  // starCountRef.on('value', function(snapshot) {
  //   updateStarCount(postElement, snapshot.val());
  // });
  // [END post_value_event_listener]

  // Listen for the starred status.
  var votedStatusRef = firebase.database().ref('posts/' + postId + '/votes/' + uid)
  votedStatusRef.on('value', function(snapshot) {
    updateVotedByCurrentUser(postElement, snapshot.val());
  });

  var danknessStatusRef = firebase.database().ref('posts/' + postId + '/dankness')
  danknessStatusRef.on('value', function(snapshot) {
    postElement.getElementsByClassName('mdl-card__title-text')[0].innerHTML = title +
                                  ":<span class='dankness'>" + Math.round(snapshot.val()*100) + "%</span> Dank ";
    console.log(snapshot.val());
  });

  var watchedStatusRef = firebase.database().ref('posts/' + postId + '/watched')
  watchedStatusRef.on('value', function(snapshot) {
    if (snapshot.val()) {
      postElement.classList.add("watched")
    } else {
      postElement.classList.add("suggested")
    }
  });

  // Keep track of all Firebase reference on which we are listening.
  listeningFirebaseRefs.push(commentsRef);
  //listeningFirebaseRefs.push(starCountRef);
  listeningFirebaseRefs.push(votedStatusRef);

  // Create new comment.
  addCommentForm.onsubmit = function(e) {
    e.preventDefault();
    createNewComment(postId, firebase.auth().currentUser.displayName, uid, commentInput.value);
    commentInput.value = '';
    commentInput.parentElement.MaterialTextfield.boundUpdateClassesHandler();
  };

  // Bind starring action.
  var onVoteClicked = function(vote) {
    var globalPostRef = firebase.database().ref('/posts/' + postId);
    toggleVote(globalPostRef, uid, vote, postElement);
  };

  upvote.onclick = function() { console.log("voting up"); onVoteClicked("up") };
  downvote.onclick = function() { console.log("voting down"); onVoteClicked("down") };

  return postElement;
}

/**
 * Writes a new comment for the given post.
 */
function createNewComment(postId, username, uid, text) {
  firebase.database().ref('post-comments/' + postId).push({
    text: text,
    author: username,
    uid: uid
  });
}

/**
 * Updates the starred status of the post.
 */
function updateVotedByCurrentUser(postElement, voted) {
  if (voted === "up") {
    postElement.getElementsByClassName('upvote')[0].classList.add('selected');
    postElement.getElementsByClassName('downvote')[0].classList.remove('selected');
  } else if (voted === "down") {
    postElement.getElementsByClassName('upvote')[0].classList.remove('selected');
    postElement.getElementsByClassName('downvote')[0].classList.add('selected');
  }
}

/**
 * Updates the number of stars displayed for a post.
 */
// function updateStarCount(postElement, nbStart) {
//   postElement.getElementsByClassName('star-count')[0].innerText = nbStart;
// }

/**
 * Creates a comment element and adds it to the given postElement.
 */
function addCommentElement(postElement, id, text, author) {
  var comment = document.createElement('div');
  comment.classList.add('comment-' + id);
  comment.innerHTML = '<span class="username"></span><span class="comment"></span>';
  comment.getElementsByClassName('comment')[0].innerText = text;
  comment.getElementsByClassName('username')[0].innerText = author || 'Anonymous';

  var commentsContainer = postElement.getElementsByClassName('comments-container')[0];
  commentsContainer.appendChild(comment);
}

/**
 * Sets the comment's values in the given postElement.
 */
function setCommentValues(postElement, id, text, author) {
  var comment = postElement.getElementsByClassName('comment-' + id)[0];
  comment.getElementsByClassName('comment')[0].innerText = text;
  comment.getElementsByClassName('fp-username')[0].innerText = author;
}

/**
 * Deletes the comment of the given ID in the given postElement.
 */
function deleteComment(postElement, id) {
  var comment = postElement.getElementsByClassName('comment-' + id)[0];
  comment.parentElement.removeChild(comment);
}

/**
 * Starts listening for new posts and populates posts lists.
 */
function startDatabaseQueries() {
  // [START my_top_posts_query]
  var myUserId = firebase.auth().currentUser.uid;
  var topUserPostsRef = firebase.database().ref('posts').orderByChild('dankness');
  // [END my_top_posts_query]
  // [START recent_posts_query]
  var recentPostsRef = firebase.database().ref('posts').limitToLast(100);
  // [END recent_posts_query]
  var userPostsRef = firebase.database().ref('user-posts/' + myUserId);

  var fetchPosts = function(postsRef, sectionElement) {
    postsRef.on('child_added', function(data) {
      var author = data.val().author || 'Anonymous';
      var containerElement = sectionElement.getElementsByClassName('posts-container')[0];

      containerElement.insertBefore(
          createPostElement(data.key, data.val().title, data.val().body, author, data.val().uid, data.val().moviePic, data.val().dankness, data.val().watched),
          containerElement.firstChild);
    });
    // postsRef.on('child_changed', function(data, old) {
    //   if(old) {
    //     var post = document.getElementById(old)
    //     post.getElementsByClassName('mdl-card__title-text')[0].innerHTML = data.val().title +
    //                       ":<span class='dankness'>" + Math.round(data.val().dankness*100) + "%</span> Dank ";
    //   }
    // });
  };

  // Fetching and displaying all posts of each sections.
  fetchPosts(topUserPostsRef, topUserPostsSection);
  fetchPosts(recentPostsRef, recentPostsSection);
  fetchPosts(userPostsRef, userPostsSection);

  // Keep track of all Firebase refs we are listening to.
  listeningFirebaseRefs.push(topUserPostsRef);
  listeningFirebaseRefs.push(recentPostsRef);
  listeningFirebaseRefs.push(userPostsRef);
}

/**
 * Writes the user's data to the database.
 */
// [START basic_write]
function writeUserData(userId, name, email, imageUrl) {
  firebase.database().ref('users/' + userId).set({
    username: name,
    email: email,
    profile_picture : imageUrl
  });
}
// [END basic_write]

/**
 * Cleanups the UI and removes all Firebase listeners.
 */
function cleanupUi() {
  // Remove all previously displayed posts.
  topUserPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';
  recentPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';
  userPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';

  // Stop all currently listening Firebase listeners.
  listeningFirebaseRefs.forEach(function(ref) {
    ref.off();
  });
  listeningFirebaseRefs = [];
}

/**
 * The ID of the currently signed-in User. We keep track of this to detect Auth state change events that are just
 * programmatic token refresh but not a User status change.
 */
var currentUID;

/**
 * Triggers every time there is a change in the Firebase auth state (i.e. user signed-in or user signed out).
 */
function onAuthStateChanged(user) {
  // We ignore token refresh events.
  if (user && currentUID === user.uid || !user && currentUID === null) {
    return;
  }
  currentUID = user ? user.uid : null;

  cleanupUi();
  if (user) {
    splashPage.style.display = 'none';
    writeUserData(user.uid, user.displayName, user.email, user.photoURL);
    startDatabaseQueries();
  } else {
    // Display the splash page where you can sign-in.
    splashPage.style.display = '';
  }
}

/**
 * Creates a new post for the current user.
 */
function newPostForCurrentUser(title, text, posterURL, dankness) {
  // [START single_value_read]
  var userId = firebase.auth().currentUser.uid;
  return firebase.database().ref('/users/' + userId).once('value').then(function(snapshot) {
    var username = snapshot.val().username;
    // [START_EXCLUDE]
    return MovieSuggestion(firebase.auth().currentUser.uid, username,
        posterURL,
        title, text, dankness);
    // [END_EXCLUDE]
  });
  // [END single_value_read]
}

/**
 * Displays the given section element and changes styling of the given button.
 */
function showSection(sectionElement, buttonElement) {
  recentPostsSection.style.display = 'none';
  userPostsSection.style.display = 'none';
  topUserPostsSection.style.display = 'none';
  addPost.style.display = 'none';
  recentMenuButton.classList.remove('is-active');
  myTopPostsMenuButton.classList.remove('is-active');

  if (sectionElement) {
    sectionElement.style.display = 'block';
  }
  if (buttonElement) {
    buttonElement.classList.add('is-active');
  }
}

// Bindings on load.
window.addEventListener('load', function() {
  // Bind Sign in button.
  signInButton.addEventListener('click', function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider);
  });

  // Bind Sign out button.
  // signOutButton.addEventListener('click', function() {
  //   firebase.auth().signOut();
  // });

  // Listen for auth state changes
  firebase.auth().onAuthStateChanged(onAuthStateChanged);

  searchMovieButton.onclick = function () {
    document.getElementById('found-movie-title').innerText = 'Not Found :(';
    document.getElementById('found-movie-summary').innerText = 'Perhaps an alternate spelling?';
    document.getElementById('found-movie-img').src = '';

    getMovieInfo(titleInput.value, function (movie) {
      document.getElementById('found-movie-title').innerText = movie.title;
      document.getElementById('found-movie-summary').innerText = movie.summary;
      document.getElementById('found-movie-img').src = movie.img;

      foundMovieSubmit.onclick = function () {
        newPostForCurrentUser(movie.title, movie.summary, movie.img, movie.ratings.rottenTomatoes).then(function() {
            myTopPostsMenuButton.click();
          });
          titleInput.value = '';
      }

    })
  }

  // Bind menu buttons.
  recentMenuButton.onclick = function() {
    showSection(recentPostsSection, recentMenuButton);
  };
  myTopPostsMenuButton.onclick = function() {
    showSection(topUserPostsSection, myTopPostsMenuButton);
  };
  addButton.onclick = function() {
    showSection(addPost);
    titleInput.value = '';
  };
  myTopPostsMenuButton.onclick();
}, false);
