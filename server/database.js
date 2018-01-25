//
const path = require('path')
const NeDB = require('nedb')

// Connect Data Base
const userDB = new NeDB({
    filename: path.join(__dirname, 'user.db'),
    autoload: true
})

const timelineDB = new NeDB({
    filename: path.join(__dirname, 'timeline.db'),
    autoload: true
})


// Get Hash Value
function getHash(pw) {
    const salt = 'EVuUekfhglaFfal'
    const crypto = require('crypto')
    const hashsum = crypto.createHash('sha512')
    hashsum.update(pw + salt)
    return hashsum.digest('hex')
}

// Generate Token for Authentication
function getAuthToken(userid) {
    const time = (new Date()).getTime()
    return getHash(`${userid}:${time}`)
}

// API Methods for DB Operating
function getUser(userid, callback) {
    userDB.findOne({userid}, (err, user) => {
        if (err || user === null) return callback(null)
        callback(user)
    })
}

// Add New User
function addUser(userid, passwd, callback) {
    const hash = getHash(passwd)
    const token = getAuthToken(userid)
    const regDoc = {userid, hash, token, friends: {}}
    userDB.insert(regDoc, (err, newdoc) => {
        if (err) return callback(null)
        callback(token)
    })
}

// Login
function login(userid, passwd, callback) {
    const hash = getHash(passwd)
    const token = getAuthToken(userid)

    // Get User Info
    getUser(userid, (user) => {
        if (!user || user.hash !== hash) {
            return callback(new Error('Authentication Error'), null)
        }
        // Update Authentication Token
        user.token = token
        updateUser(user, (err) => {
            if (err) return callback(err, null)
            callback(null, token)
        })
    })
}

// Check Authentication Token
function checkToken(userid, token, callback) {
    // Get User Info
    getUser(userid, (user) => {
        if (!user || user.token !== token) {
            return callback(new Error('Failed Authentication', null))
        }
        callback(null, user)
    })
}

//  Update User Information
function updateUser(user, callback) {
    userDB.update({userid: user.userid}, user, {}, (err, n) => {
        if (err) return callback(err, null)
        callback(null)
    })
}

// Get Friends Time Line
function getFriendsTimeLine(userid, token, callback) {
    checkToken(userid, token, callback, (err, user) => {
        if (err) return callback(new Error('Failed Authentication', null))

        // Get Friends List
        const friends = []
        for (const f in user.friends) friends.push(f)
        friends.push(userid) // Show Friends + My Time Line

        // Get Friends Time Line limited 20.
        timelineDB
            .find({userid: {$in: friends}})
            .sort({time: -1})
            .limit(20)
            .exec((err, docs) => {
                if (err) {
                    callback(new Error('DB Error'), null)
                    return
                }
                callback(null, docs)
            })
    })
}

module.exports = {
    userDB, timelineDB, getUser, addUser, login, checkToken, updateUser, getFriendsTimeline
}