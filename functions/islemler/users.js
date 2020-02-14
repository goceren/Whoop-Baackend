const { admin, database } = require("../util/admin");
const config = require("../util/config");
const firebase = require("firebase");
firebase.initializeApp(config);
const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails
} = require("../util/kontroller");

// KAYIT OLMA İŞLEMİ

exports.signup = (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    handle: request.body.handle
  };

  const { valid, errors } = validateSignupData(newUser);

  if (!valid) return response.status(400).json(errors);

  const noImg = "no-img.png";

  let token, userId;
  database
    .doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        return response
          .status(400)
          .json({ handle: "Bu Kullanıcı Adı Zaten Alınmış" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then(data => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idToken => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        userId
      };
      return database.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return response.status(201).json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return response.status(400).json({ email: "Email kullanılıyor." });
      }
      if (err.code === "auth/weak-password") {
        return response.status(500).json({ password: "Şifre En Az 6 Karakter Olmalıdır." })
      }
      else {
        return response
          .status(500)
          .json({ general: "Birşeyler yanlış gitti. Lütfen tekrar deneyiniz." });
      }
    });
};

// KULLANICI GİRİŞ İŞLEMİ

exports.login = (request, response) => {
  const user = {
    email: request.body.email,
    password: request.body.password
  };

  const { valid, errors } = validateLoginData(user);

  if (!valid) return response.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return response.json({ token });
    })
    .catch(err => {
      console.error(err);
      // auth/wrong-password
      // auth/user-not-user
      return response
        .status(403)
        .json({ general: "Hatalı giriş yaptınız. Bilgileri Kontrol Ediniz." });
    });
};

// KULLANICI DETAY EKLEME İŞLEMİ

exports.addUserDetails = (request, response) => {
  let userDetails = reduceUserDetails(request.body);

  database
    .doc(`/users/${request.user.handle}`)
    .update(userDetails)
    .then(() => {
      return response.json({ message: "Detaylar başarıyla eklendi." });
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

// BAŞKA KULLANICI PROFİL DETAYLARI

exports.getUserDetails = (request, response) => {
  let userData = {};
  database
    .doc(`/users/${request.params.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.user = doc.data();
        return database
          .collection("whoops")
          .where("userHandle", "==", request.params.handle)
          .orderBy("createdAt", "desc")
          .get();
      } else {
        return response.status(404).json({ error: "Kullanıcı Bulunamadı" });
      }
    })
    .then(data => {
      userData.whoops = [];
      data.forEach(doc => {
        userData.whoops.push({
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          userHandle: doc.data().userHandle,
          userImage: doc.data().userImage,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          whoopId: doc.id
        });
      });
      return response.json(userData);
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

// PROFİLİMİ GÖRÜNTÜLEME İŞLEMİ

exports.getAuthenticatedUser = (request, response) => {
  let userData = {};
  database
    .doc(`/users/${request.user.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return database
          .collection("likes")
          .where("userHandle", "==", request.user.handle)
          .get();
      }
    })
    .then(data => {
      userData.likes = [];
      data.forEach(doc => {
        userData.likes.push(doc.data());
      });
      return database
        .collection("notifications")
        .where("recipient", "==", request.user.handle)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
    })
    .then(data => {
      userData.notifications = [];
      data.forEach(doc => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          createdAt: doc.data().createdAt,
          whoopId: doc.data().whoopId,
          type: doc.data().type,
          read: doc.data().read,
          notificationId: doc.id
        });
      });
      return response.json(userData);
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

// PRFİL FOTOGRAFINI GÜNCELLEME İŞLEMİ

exports.uploadImage = (request, response) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: request.headers });

  let imageToBeUploaded = {};
  let imageFileName;

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname, file, filename, encoding, mimetype);
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return response.status(400).json({ error: "Hatalı dosya formatı" });
    }
    // my.image.png => ['my', 'image', 'png']
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 32756238461724837.png
    imageFileName = `${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype
          }
        }
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return database
          .doc(`/users/${request.user.handle}`)
          .update({ imageUrl });
      })
      .then(() => {
        return response.json({ message: "Resim başarıyla yüklendi" });
      })
      .catch(err => {
        console.error(err);
        return response.status(500).json({ error: "Birşeyler Yanlış Gitti" });
      });
  });
  busboy.end(request.rawBody);
};

// BİLDİRİM OKUNDU İŞLEMİ

exports.markNotificationsRead = (request, response) => {
  let batch = database.batch();
  request.body.forEach(notificationId => {
    const notification = database.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return response.json({
        message: "Bildirim görüldü olarak işaretlendi."
      });
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};
