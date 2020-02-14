const functions = require('firebase-functions');
const app = require('express')();

const cors = require('cors');
app.use(cors());

const girisKontrol = require('./util/girisKontrol');
const { database } = require('./util/admin');

const {
  getAllWhoops,
  postOneWhoop,
  getWhoop,
  commentOnWhoop,
  likeWhoop,
  unlikeWhoop,
  deleteWhoop
} = require('./islemler/whoops');
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead
} = require('./islemler/users');

// WHOOP İŞLEMLERİ
app.get('/whoops', getAllWhoops);
app.post('/whoop', girisKontrol, postOneWhoop);
app.get('/whoop/:whoopId', getWhoop);
app.delete('/whoop/:whoopId', girisKontrol, deleteWhoop);
app.get('/whoop/:whoopId/like', girisKontrol, likeWhoop);
app.get('/whoop/:whoopId/unlike', girisKontrol, unlikeWhoop);
app.post('/whoop/:whoopId/comment', girisKontrol, commentOnWhoop);

// KULLANICI İŞLEMLERİ
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', girisKontrol, uploadImage);
app.post('/user', girisKontrol, addUserDetails);
app.get('/user', girisKontrol, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', girisKontrol, markNotificationsRead);

// API 
exports.api = functions.region('europe-west1').https.onRequest(app);

// BEĞENİ BİLDİRİMİ
exports.createNotificationOnLike = functions
  .region('europe-west1')
  .firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return database.doc(`/whoops/${snapshot.data().whoopId}`).get()
      .then((doc) => {
        if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
          return database.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            whoopId: doc.id
          });
        }
      })
      .catch((err) => console.error(err));
  });

// UNLİKE YAPILDIĞINDA BİLDİRİM SİLİNMESİ

exports.deleteNotificationOnUnLike = functions
  .region('europe-west1')
  .firestore.document('likes/{id}')
  .onDelete((snapshot) => {
    return database
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });

// YORUM BİLDİRİMİ

exports.createNotificationOnComment = functions
  .region('europe-west1')
  .firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    return database
      .doc(`/whoops/${snapshot.data().whoopId}`)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
          return database.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'comment',
            read: false,
            whoopId: doc.id
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });

// KULLANICI FOTOGRAF DEĞİŞTİRME İŞLEMİ

exports.onUserImageChange = functions
  .region('europe-west1')
  .firestore.document('/users/{userId}')
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log('Fotoğraf Değiştirildi.');
      const batch = database.batch();
      return database
        .collection('whoops')
        .where('userHandle', '==', change.before.data().handle)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const whoop = database.doc(`/whoops/${doc.id}`);
            batch.update(whoop, { userImage: change.after.data().imageUrl });
          });
          return batch.commit();
        });
    } else return true;
  });

// WHOOP DELETE
exports.onWhoopDelete = functions
  .region('europe-west1')
  .firestore.document('/whoops/{whoopId}')
  .onDelete((snapshot, context) => {
    const whoopId = context.params.whoopId;
    const batch = database.batch();
    return database
      .collection('comments')
      .where('whoopId', '==', whoopId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(database.doc(`/comments/${doc.id}`));
        });
        return database
          .collection('likes')
          .where('whoopId', '==', whoopId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(database.doc(`/likes/${doc.id}`));
        });
        return database
          .collection('notifications')
          .where('whoopId', '==', whoopId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(database.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => console.error(err));
  });
