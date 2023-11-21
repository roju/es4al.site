import { videoIds, tmSpcCmplxExpl } from './constants.js'
import { testQuestions } from './test-questions.js'
const letterOptions = ['a', 'b', 'c', 'd'];

window.saveStudentInfo = saveStudentInfo;
window.savePreTest = savePreTest;
window.savePostTest = savePostTest;
window.checkAnswers = checkAnswers;
window.showTmSpcCmplxExpl = showTmSpcCmplxExpl;

document.addEventListener("DOMContentLoaded", function() {
    if (window.location.pathname.endsWith('/video/')) {
        assignVideo();
    }
    else if (window.location.pathname.endsWith('/pre-test/')) {
        generateQuestions();
    }
    else if (window.location.pathname.endsWith('/post-test/')) {
        generateQuestions();
    }
});

async function saveStudentInfo() {
    try {
        const age = getUserAge();
        const csMajor = getMultipleChoiceValue('cs_major');
        const educationLevel = getMultipleChoiceValue('edu_level');
        const race = getMultipleChoiceValue('race');

        let singleUserData = {
            age,
            csMajor,
            educationLevel,
            race
        }
        console.log(JSON.stringify(singleUserData, null, 2));

        // show loading indicator while waiting for assignments
        document.getElementById('studentInfoNext').style.display="none";
        document.getElementById('studentInfoLoader').style.display="block";

        const assignments = await getAssignments();
        console.log(assignments);
        singleUserData = { ...singleUserData, ...assignments };
        localStorage.clear();
        localStorage.setItem('singleUserData', JSON.stringify(singleUserData));
        window.location.href = '/pages/pre-test';
    }
    catch (err) {
        console.error(err);
        alert(err);
    }
}

async function getAssignments() {
    const requestOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    };
    const apiUrl = 'https://f8k5jcocqb.execute-api.us-east-1.amazonaws.com/PROD/assign';
    try {
        const response = await fetch(apiUrl, requestOptions);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const resJson = await response.json();
        return resJson;
    }
    catch(err) {
        console.log(err);
    }
}

function showTmSpcCmplxExpl() {
    var explanationContainer = document.getElementById("explanation-container");
    var tmSpcCmplxExplLink = document.getElementById("tmSpcCmplxExplLink");
    if (explanationContainer.innerHTML == '') {
        explanationContainer.innerHTML = tmSpcCmplxExpl;
        tmSpcCmplxExplLink.innerHTML = 'Hide explanation';
    } else {
        explanationContainer.innerHTML = '';
        tmSpcCmplxExplLink.innerHTML = 'What is time/space complexity?';
    }

}

function generateQuestions() {
    const singleUserData = getLocalSingleUserData();
    const { algorithm } = singleUserData;
    var container = document.getElementById("questions-container");

    testQuestions[`${algorithm}`].forEach((questionData, index) => {
        var questionContainer = document.createElement("div");
        questionContainer.classList.add("question-container");

        var questionText = document.createElement("p");
        questionText.textContent = (index + 1) + ". " + questionData.question;
        questionContainer.appendChild(questionText);

        questionData.answers.forEach((option, optionIndex) => {
            var label = document.createElement("label");
            var radio = document.createElement("input");
            radio.type = "radio";
            radio.name = "question" + index;
            radio.value = optionIndex;
            radio.id = "q" + index + "option" + optionIndex;

            label.appendChild(radio);
            label.appendChild(document.createTextNode(` ${letterOptions[optionIndex]}) ${option}`));

            questionContainer.appendChild(label);
            questionContainer.appendChild(document.createElement("br"));
        });

        container.appendChild(questionContainer);
    });
}

function scoreTest(algorithm) {
    var correctAnswers = 0;
    testQuestions[`${algorithm}`].forEach((questionData, index) => {
        const answer = getMultipleChoiceValue(`question${index}`);
        if (answer == questionData.correctAnswer) {
            correctAnswers += 1;
        }
    });
    const questionCount = testQuestions[`${algorithm}`].length;
    return (correctAnswers / questionCount) * 100;
}

function savePreTest() {
    try {
        var singleUserData = getLocalSingleUserData();
        const score = scoreTest(singleUserData.algorithm);
        singleUserData.preTestScore = score;
        localStorage.setItem('singleUserData', JSON.stringify(singleUserData));
        window.location.href = '/pages/video';
    }
    catch (err) {
        alert(err);
    }
}

function assignVideo() {
    const singleUserData = getLocalSingleUserData();
    console.log(singleUserData);
    const { algorithm, learningMethod } = singleUserData;
    console.log(algorithm);
    console.log(learningMethod);
    document.getElementById('video-frame').setAttribute("src",
        `https://www.youtube.com/embed/${videoIds[algorithm][learningMethod]}`
    );
}

async function savePostTest() {
    try {
        var singleUserData = getLocalSingleUserData();
        const score = scoreTest(singleUserData.algorithm);
        singleUserData.postTestScore = score;
        console.log(singleUserData);
        // show loading indicator while waiting for upload
        document.getElementById('postTestNext').style.display="none";
        document.getElementById('postTestLoader').style.display="block";
        await uploadDataToCloud(singleUserData);
        checkAnswers(singleUserData);
        document.getElementById('postTestLoader').style.display="none";
        document.getElementById('surveyFinish').style.display="block";
    }
    catch (err) {
        console.log(err);
        alert(err);
    }
}

function checkAnswers(singleUserData) {
    const { algorithm } = singleUserData;
    var resultContainer = document.getElementById("results-container");
    resultContainer.innerHTML = ""; // Clear previous results

    testQuestions[`${algorithm}`].forEach((questionData, index) => {
        const selectedAnswer = getSelectedAnswer(index);
        console.log(selectedAnswer);
        console.log(questionData.correctAnswer);
        const isCorrect = selectedAnswer == questionData.correctAnswer;

        var resultText = document.createElement("p");
        resultText.textContent = (index + 1) + ". " + questionData.question + " - ";
        resultText.textContent += isCorrect ? "Correct" : "Incorrect";
        resultText.style.color = isCorrect ? "green" : "red";

        if (!isCorrect) {
            var correctAnswerText = document.createElement("span");
            correctAnswerText.textContent =
                " Correct answer: " + letterOptions[questionData.correctAnswer];
            correctAnswerText.style.fontWeight = "bold";
            resultText.appendChild(correctAnswerText);
        }
        resultContainer.appendChild(resultText);
    });

    var preTestScoreText = document.createElement("p");
    var postTestScoreText = document.createElement("p");
    const { preTestScore, postTestScore } = singleUserData;
    preTestScoreText.textContent = `Pre-test score: ${preTestScore}%`;
    postTestScoreText.textContent = `Post-test score: ${postTestScore}%`;
    resultContainer.appendChild(preTestScoreText);
    resultContainer.appendChild(postTestScoreText);
}

function getSelectedAnswer(questionIndex) {
    var radioButtons = document.getElementsByName("question" + questionIndex);
    for (var i = 0; i < radioButtons.length; i++) {
        if (radioButtons[i].checked) {
            return Number(radioButtons[i].value);
        }
    }
    return null;
}

async function uploadDataToCloud(singleUserData) {
    const requestOptions = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(singleUserData)
    };
    const apiUrl = 'https://f8k5jcocqb.execute-api.us-east-1.amazonaws.com/PROD/user-data';
    try {
        const response = await fetch(apiUrl, requestOptions);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        console.log('Success:', response);
    }
    catch(err) {
        console.log(err);
    }
}

export function getLocalSingleUserData() {
    var singleUserData = null;
    try {
        singleUserData = JSON.parse(localStorage.getItem("singleUserData"));
    }
    catch(err) {
        throw Error('Please modify your browser permsissons to allow localStorage');
    }
    if (!singleUserData) {
        throw Error('Student info not found. Please start from the home page.');
    }
    return singleUserData;
}

function getMultipleChoiceValue(name) {
    var radios = document.getElementsByName(name);
    var answer = '';
    for (var i = 0, length = radios.length; i < length; i++) {
        if (radios[i].checked) {
            answer = radios[i].value;
           break;
         }
    }
    if (answer == '' ) {
      throw Error(`Question is required: ${name}`)
    }
    return Number(answer);
};

function getUserAge() {
    var age = document.getElementById('age').value;
    if (!age || isNaN(age)) {
        throw Error('Age must be a number')
    }
    return Number(age);
}