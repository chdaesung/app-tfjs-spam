/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as DICTIONARY from '/dictionary.js';

// The number of input elements the ML Model is expecting.
const ENCODING_LENGTH = 20;

/**
 * Function that takes an array of words, converts words to tokens,
 * and then returns a Tensor representation of the tokenization that
 * can be used as input to the machine learning model.
 */
function tokenize(wordArray) {
	// Always start with the START token.
	let returnArray = [DICTIONARY.START];

	// Loop through the words in the sentence you want to encode.
	// If word is found in dictionary, add that number else
	// you add the UNKNOWN token.
	for (var i = 0; i < wordArray.length; i++) {
		let encoding = DICTIONARY.LOOKUP[wordArray[i]];
		returnArray.push(encoding === undefined ? DICTIONARY.UNKNOWN : encoding);
	}

	// Finally if the number of words was < the minimum encoding length
	// minus 1 (due to the start token), fill the rest with PAD tokens.
	while (i < ENCODING_LENGTH - 1) {
		returnArray.push(DICTIONARY.PAD);
		i++;
	}

	// Log the result to see what you made.
	console.log([returnArray]);

	// Convert to a TensorFlow Tensor and return that.
	return tf.tensor([returnArray]);
}

const POST_COMMENT_BTN = document.getElementById('post');
const COMMENT_TEXT = document.getElementById('comment');
const COMMENTS_LIST = document.getElementById('commentsList');
// CSS styling class to indicate comment is being processed when
// posting to provide visual feedback to users.
const PROCESSING_CLASS = 'processing';

// Store username of logged in user. Right now you have no auth
// so default to Anonymous until known.
var currentUserName = 'Anonymous';

/**
 * Function to handle the processing of submitted comments.
 **/
/**
 * Function to handle the processing of submitted comments.
 **/
function handleCommentPost() {
	// Only continue if you are not already processing the comment.
	if (!POST_COMMENT_BTN.classList.contains(PROCESSING_CLASS)) {
		// Set styles to show processing in case it takes a long time.
		POST_COMMENT_BTN.classList.add(PROCESSING_CLASS);
		COMMENT_TEXT.classList.add(PROCESSING_CLASS);

		// Grab the comment text from DOM.
		let currentComment = COMMENT_TEXT.innerText;
		// Convert sentence to lower case which ML Model expects
		// Strip all characters that are not alphanumeric or spaces
		// Then split on spaces to create a word array.
		let lowercaseSentenceArray = currentComment
			.toLowerCase()
			.replace(/[^\w\s]/g, ' ')
			.split(' ');

		// Create a list item DOM element in memory.
		let li = document.createElement('li');

		// Remember loadAndPredict is asynchronous so you use the then
		// keyword to await a result before continuing.
		loadAndPredict(tokenize(lowercaseSentenceArray), li).then(function () {
			// Reset class styles ready for the next comment.
			POST_COMMENT_BTN.classList.remove(PROCESSING_CLASS);
			COMMENT_TEXT.classList.remove(PROCESSING_CLASS);

			let p = document.createElement('p');
			p.innerText = COMMENT_TEXT.innerText;

			let spanName = document.createElement('span');
			spanName.setAttribute('class', 'username');
			spanName.innerText = currentUserName;

			let spanDate = document.createElement('span');
			spanDate.setAttribute('class', 'timestamp');
			let curDate = new Date();
			spanDate.innerText = curDate.toLocaleString();

			li.appendChild(spanName);
			li.appendChild(spanDate);
			li.appendChild(p);
			COMMENTS_LIST.prepend(li);

			// Reset comment text.
			COMMENT_TEXT.innerText = '';
		});
	}
}

POST_COMMENT_BTN.addEventListener('click', handleCommentPost);

// Set the URL below to the path of the model.json file you uploaded.
const MODEL_JSON_URL = 'model.json'; // Enter 'model.json' here.
//Or use 'https://cdn.glitch.global/37021009-b771-48a8-aa02-42728a3ad364/model.json?v=1689908989460';

// Set the minimum confidence for spam comments to be flagged.
// Remember this is a number from 0 to 1, representing a percentage
// So here 0.75 == 75% sure it is spam.
const SPAM_THRESHOLD = 0.5;

// Create a variable to store the loaded model once it is ready so
// you can use it elsewhere in the program later.
var model = undefined;

/**
 * Asynchronous function to load the TFJS model and then use it toS
 * predict if an input is spam or not spam. The 2nd parameter
 * allows us to specify the DOM element list item you are currently
 * classifying so you can change it+s style if it is spam!
 */
async function loadAndPredict(inputTensor, domComment) {
	// Load the model.json and binary files you hosted. Note this is
	// an asynchronous operation so you use the await keyword
	if (model === undefined) {
		model = await tf.loadLayersModel(MODEL_JSON_URL);
	}

	// Once model has loaded you can call model.predict and pass to it
	// an input in the form of a Tensor. You can then store the result.
	var results = await model.predict(inputTensor);

	// Print the result to the console for us to inspect.
	/*
	GitHub Copilot: In the given code, the `model.predict` function returns a tensor 
	that contains the result of the prediction made by the model. The `results` tensor 
	is then printed to the console using the `print()` method. 
	However, the `print()` method only displays the tensor's shape and data type, 
	but not its actual values. To extract the actual values of the `results` tensor, 
	the `data()` method is used. The `data()` method returns a promise that resolves to 
	a typed array containing the tensor's values. 
    In the given code, the `dataArray` variable is assigned the result of calling `data()` 
	on the `results` tensor. The `dataArray` is then used to check if the second element 
	of the array is greater than the `SPAM_THRESHOLD` value. Therefore, the `data()` method 
	is used to extract the actual values of the `results` tensor so that they can be used in further computations or comparisons.
	*/
	results.print();
	// tf.data() : Asynchronously downloads the values from the tf.Tensor.
	// Returns a promise of TypedArray that resolves when the computation has finished.
	// https://js.tensorflow.org/api/latest/#tf.Tensor.data
	results.data().then((dataArray) => {
		if (dataArray[1] > SPAM_THRESHOLD) {
			domComment.classList.add('spam');
		} else {
			// Emit socket.io comment event for server to handle containing
			// all the comment data you would need to render the comment on
			// a remote client's front end.
			socket.emit('comment', {
				username: currentUserName,
				timestamp: domComment.querySelectorAll('span')[1].innerText,
				comment: domComment.querySelectorAll('p')[0].innerText,
			});
		}
	});
}

//loadAndPredict(tf.tensor([[1,3,12,18,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]]));

// Connect to Socket.io on the Node.js backend.
var socket = io.connect();

function handleRemoteComments(data) {
	// Render a new comment to DOM from a remote client.
	let li = document.createElement('li');
	let p = document.createElement('p');
	p.innerText = data.comment;

	let spanName = document.createElement('span');
	spanName.setAttribute('class', 'username');
	spanName.innerText = data.username;

	let spanDate = document.createElement('span');
	spanDate.setAttribute('class', 'timestamp');
	spanDate.innerText = data.timestamp;

	li.appendChild(spanName);
	li.appendChild(spanDate);
	li.appendChild(p);

	COMMENTS_LIST.prepend(li);
}

// Add event listener to receive remote comments that passed
// spam check.
socket.on('remoteComment', handleRemoteComments);
