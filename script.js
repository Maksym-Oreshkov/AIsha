"use strict";

// Переменные для управления чатом
let chats = [];
let currentChatIndex = null;

const chatContainer = document.getElementById("chatContainer");
const chatList = document.getElementById("chatList");
const userInput = document.getElementById("userInput");

// Функция для сохранения чатов в localStorage
function setLocalStorage() {
  localStorage.setItem("chats", JSON.stringify(chats));
}

// Функция для загрузки чатов из localStorage
function getLocalStorage() {
  const data = localStorage.getItem("chats");
  if (data) {
    chats = JSON.parse(data);
    updateChatList(); // Обновляем список чатов в левой колонке
  } else {
    console.log("Данные в localStorage не найдены");
  }
}

// Обновляем список чатов в левой колонке
function updateChatList() {
  chatList.innerHTML = ""; // Очищаем старый список чатов

  chats.forEach((chat, index) => {
    const newChatItem = document.createElement("li");
    newChatItem.textContent = chat.messages[0]?.content || "Пустой чат"; // Если нет сообщений, показываем "Пустой чат"
    newChatItem.addEventListener("click", () => loadChat(index)); // При нажатии загружаем выбранный чат
    chatList.appendChild(newChatItem);
  });
}

// Загружаем выбранный чат и отображаем его в центральном чате
function loadChat(index) {
  currentChatIndex = index;
  const chat = chats[index];

  // Очищаем текущее содержимое чата
  chatContainer.innerHTML = "";

  chat.messages.forEach((msg) => {
    const messageElement = document.createElement("div");
    // Добавляем стили в зависимости от роли сообщения (user или assistant)
    if (msg.role === "user") {
      messageElement.classList.add("user-message");
      messageElement.textContent = `Вы: ${msg.content}`;
    } else {
      messageElement.classList.add("assistant-message");
      messageElement.textContent = `AIsha: ${msg.content}`;
    }
    chatContainer.appendChild(messageElement);
  });

  chatContainer.scrollTop = chatContainer.scrollHeight; // Прокручиваем чат вниз
}

// Сохраняем новый чат в массив и обновляем интерфейс
function saveChat(firstMessage) {
  const chatIndex = chats.length;

  // Создаем новый чат с первым сообщением пользователя
  chats.push({
    messages: [{ role: "user", content: firstMessage }],
  });

  // Добавляем новый элемент в список чатов в левой колонке
  const newChatItem = document.createElement("li");
  newChatItem.textContent = firstMessage; // Отображаем первое сообщение в списке
  newChatItem.addEventListener("click", () => loadChat(chatIndex)); // При нажатии загружаем чат
  chatList.appendChild(newChatItem);

  setLocalStorage(); // Сохраняем локально
}

let shouldAutoScroll = true; // По умолчанию включаем автопрокрутку, если нужно
const scrollButton = document.createElement("scroll");

document.body.appendChild(scrollButton);
// Функция для отправки сообщения и получения ответа от AI
async function sendMessage() {
  const userInputValue = userInput.value.trim(); // Получаем сообщение пользователя

  if (!userInputValue) return; // Если сообщение пустое, ничего не делаем

  if (currentChatIndex === null) {
    // Если это новый чат, сохраняем его с первым сообщением
    saveChat(userInputValue);

    currentChatIndex = chats.length - 1; // Устанавливаем текущий активный чат
  } else {
    // Добавляем сообщение в существующий чат
    chats[currentChatIndex].messages.push({
      role: "user",
      content: userInputValue,
    });
  }

  // Сохраняем в localStorage
  setLocalStorage();

  textarea.value = "";
  textarea.style.height = "auto"; // Возвращаем строку в исходный вид!
  const userMessage = document.createElement("div");
  userMessage.classList.add("user-message");
  userMessage.textContent = `Вы: ${userInputValue}`;
  chatContainer.appendChild(userMessage);

  // Прокручиваем вниз только если автопрокрутка включена
  if (shouldAutoScroll) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  userInput.value = "";

  // Объявляем переменную для отображения ответа
  let assistantMessageElement = document.createElement("div");
  assistantMessageElement.classList.add("assistant-message");
  chatContainer.appendChild(assistantMessageElement);

  // Прокручиваем вниз только если автопрокрутка включена
  if (shouldAutoScroll) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Отправляем запрос к API OpenAI для получения ответа
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: ``,
      },
      body: JSON.stringify({
        model: "gpt-3-turbo",
        messages: chats[currentChatIndex].messages,
        temperature: 0.5,
        max_tokens: 800,
        stream: true, // Включаем потоковую передачу данных
      }),
    });

    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Декодируем поток данных
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line.trim().startsWith("data: ")) {
          const jsonString = line.replace("data: ", "").trim();
          if (jsonString === "[DONE]") {
            break;
          }

          try {
            const parsedData = JSON.parse(jsonString);
            const content = parsedData.choices[0].delta?.content || "";
            assistantMessage += content;

            // Постепенно обновляем текст
            assistantMessageElement.innerHTML = `AIsha: ${assistantMessage}`;
            // Только прокручиваем вниз, если `shouldAutoScroll` равен true
            if (shouldAutoScroll) {
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          } catch (error) {
            console.error("Ошибка при разборе JSON:", error);
          }
        }
      }
    }

    // Добавляем сообщение AI в текущий чат
    chats[currentChatIndex].messages.push({
      role: "assistant",
      content: assistantMessage,
    });

    // Сохраняем обновлённый чат в localStorage
    setLocalStorage();
  } catch (error) {
    console.error("Ошибка при обращении к OpenAI API:", error);
  }
}

// Функция для отслеживания ручной прокрутки
chatContainer.addEventListener("scroll", () => {
  const isAtBottom =
    chatContainer.scrollTop + chatContainer.clientHeight >=
    chatContainer.scrollHeight - 10;
  if (!isAtBottom) {
    shouldAutoScroll = false;
    scrollButton.style.display = "block"; // Показываем кнопку для включения автопрокрутки
  } else {
    shouldAutoScroll = true;
    scrollButton.style.display = "none"; // Скрываем кнопку, если прокрутка внизу
  }
});

// Функция для включения автопрокрутки по клику на кнопку
scrollButton.addEventListener("click", () => {
  shouldAutoScroll = true;
  chatContainer.scrollTop = chatContainer.scrollHeight; // Прокручиваем вниз
  scrollButton.style.display = "none"; // Скрываем кнопку
});

// Инициализация приложения при загрузке страницы
window.onload = function () {
  getLocalStorage(); // Загружаем чаты из localStorage при загрузке страницы

  // Проверяем, есть ли сохраненные данные пользователя
  const savedTelegramID = localStorage.getItem("telegramID");
  const savedPassword = localStorage.getItem("password");

  if (savedTelegramID && savedPassword) {
    // Заполняем поля логина сохраненными данными
    userLog.value = savedTelegramID;
    userPswrd.value = savedPassword;

    // Имитируем нажатие кнопки "Войти"
    sumbitLoginBtn.click();
  }
};

// Отправка сообщения при нажатии кнопки "Отправить"
document
  .getElementById("sendMessageBtn")
  .addEventListener("click", sendMessage);

// Отправка сообщения при нажатии клавиши Enter
userInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault(); // Предотвращаем переход на новую строку
    sendMessage(); // Отправляем сообщение
  }
});
document
  .getElementById("sendMessageBtn")
  .addEventListener("click", sendMessage);

const account1 = {
  telegramID: 1123456789,
  pswrd: 1111,
  token: 200,
  leng: "Ru",
};

const accounts = [account1];

const audioRec = new Audio("audio/recording.mp3");

const firstContainer = document.querySelector(".first-container");
const mainSection = document.querySelector(".main-section");
const mainBody = document.querySelector(".main-body");

const loginContainer = document.querySelector(".login-container");
const mainBtnLogin = document.querySelector(".btn-login");
const btnClose = document.querySelector(".btn-close");
const btnChatPanel = document.querySelector(".btn-chat-panel");
const btnNewChat = document.querySelector(".btn-new-chat-panel");
const panels = document.querySelectorAll(".panel");
const userLog = document.querySelector(".login__input--user");
const userPswrd = document.querySelector(".login__input--pswrd");
const sumbitLoginBtn = document.querySelector(".sumbit-login-btn");
let loginError = document.querySelector(".login-error");
const bgVideo = document.getElementById("bgVideo");

const textarea = document.querySelector(".request__input");
const micBtn = document.getElementById("micBtn");
const requestInput = document.getElementById("requestInput");

mainBtnLogin.addEventListener("click", function () {
  loginContainer.classList.remove("hidden");
});

btnClose.addEventListener("click", function () {
  loginContainer.classList.add("hidden");
});

panels.forEach((panel) => {
  panel.addEventListener("click", function () {
    // Если у панели уже есть класс "active", удаляем его
    if (panel.classList.contains("active")) {
      panel.classList.remove("active");
    } else {
      // Удаляем класс "active" у всех панелей
      removeActivePanel();
      // Добавляем класс "active" к текущей панели
      panel.classList.add("active");
    }
  });
});

// Функция для удаления класса "active" у всех панелей
function removeActivePanel() {
  panels.forEach((panel) => {
    panel.classList.remove("active");
  });
}

/////// Новый чат /////////

btnNewChat.addEventListener("click", function () {
  // Очистить панель чата
  chatContainer.innerHTML = "";

  // Сбросить индекс текущего чата
  currentChatIndex = null;

  // Обновить интерфейс
  updateChatList();

  // Очищаем поле ввода
  userInput.value = "";
});

///////////////// Логин и вход в систему (Заглушка Account1) /////////////////

let currentAccount;

sumbitLoginBtn.addEventListener("click", function (e) {
  e.preventDefault();

  const userInput = Number(userLog.value);
  const userPassword = userPswrd.value;
  const rememberMe = document.getElementById("rememberme").checked;

  currentAccount = accounts.find(function (acc) {
    return acc.telegramID === userInput;
  });

  if (currentAccount && currentAccount.pswrd === Number(userPassword)) {
    // Если установлен флажок "Запомнить меня"
    if (rememberMe) {
      // Сохраняем данные пользователя в localStorage
      localStorage.setItem("telegramID", userInput);
      localStorage.setItem("password", userPassword);
    } else {
      // Удаляем данные из localStorage, если они были сохранены ранее
      localStorage.removeItem("telegramID");
      localStorage.removeItem("password");
    }

    // Продолжаем процесс входа
    firstContainer.classList.add("hidden");
    mainSection.classList.remove("hidden");
    loginContainer.classList.add("hidden");
  } else {
    console.log("Wrong password");
    loginError.textContent =
      "Неверный пароль или Telegram ID. Попробуйте снова.";
  }
});

////////////// Строка запроса /////////////////
textarea.addEventListener("input", function () {
  this.style.height = "auto"; // Сбрасываем высоту
  this.style.height = this.scrollHeight + "px"; // Устанавливаем новую высоту по контенту

  // Когда высота превышает max-height, добавляется скролл
  if (this.scrollHeight > parseInt(getComputedStyle(this).maxHeight)) {
    this.style.overflowY = "auto"; // Включаем скролл, если текста слишком много
    this.style.overflowY = "hidden"; // Убираем скролл, если текста достаточно мало
  }
});
// Отправка сообщения при нажатии "Enter"
textarea.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault(); // Предотвращаем переход на новую строку
    sendMessage(); // Вызываем функцию отправки сообщения
  }
});

/////////// Голосовой ввод строки через микрофон /////////////////

// Проверяем поддержку Web Speech API
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  // Настройки распознавания
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  // Список поддерживаемых языков (русский и английский)
  const languages = ["ru-RU", "en-US"]; // Можно добавить больше языков
  let currentLangIndex = 0;

  // Функция для начала распознавания
  function startRecognition(lang) {
    recognition.lang = lang;
    recognition.start();
    console.log(`Распознавание запущено на языке: ${lang}`);
  }

  // Событие нажатия на микрофон
  micBtn.addEventListener("click", () => {
    audioRec.play();
    currentLangIndex = 0; // Сбрасываем на первый язык
    startRecognition(languages[currentLangIndex]);
    micBtn.classList.add("recording");
    recognition.addEventListener("end", () => {
      micBtn.classList.remove("recording");
    });
  });

  // Обработка успешного распознавания
  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript;
    console.log(`Распознанный текст: ${transcript}`);
    userInput.value = transcript; // Вставляем распознанный текст в поле
  });

  // Попытка следующего языка при ошибке
  recognition.addEventListener("error", (event) => {
    if (event.error === "no-speech" || event.error === "nomatch") {
      console.log(`Ошибка распознавания на языке: ${recognition.lang}`);
      currentLangIndex++;
      if (currentLangIndex < languages.length) {
        startRecognition(languages[currentLangIndex]);
      } else {
        console.log("Не удалось распознать речь ни на одном языке.");
      }
    } else {
      console.error("Ошибка распознавания:", event.error);
    }
  });

  // Событие завершения записи (если не было ошибок)
  recognition.addEventListener("end", () => {
    console.log("Запись завершена");
  });
} else {
  console.error("Web Speech API не поддерживается вашим браузером.");
}

/* function playVideo() {
  bgVideo.play(); // Запуск видео вручную
} */
