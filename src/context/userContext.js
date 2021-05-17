import React, { useEffect, useState, createContext } from 'react';
import resources from '../utils/resources';
import Gun from 'gun/gun';
import sea from 'gun/sea';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed';
import 'gun/lib/then';
import { createTweetContainer } from '../utils';

import { sha256 } from '../utils/crypto';



const dpeepUserKeys = 'dpeepUserKeys';


const UserContext = createContext(null);
UserContext.displayName = 'userContext';


const UserProvider = (props) => {

    const [gun] = useState(Gun()); // { peers: serverpeers }
    const [gunUser, setGunUser] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(null);

    const [signedUp, setSignedUp] = useState(false);
    const [user, setUser] = useState(null);
    const [users] = useState({});

    // The feed is global, so its available for build up in the background
    const [feed, setFeed] = useState(null);
    const [feedIndex, setFeedIndex] = useState(new Map());
    const [feedReady, setFeedReady] = useState(new Map());
    const [messageReceived, setMessageReceived] = useState(null);


    const login = React.useCallback(
        async (keys) => {
            gun.user().auth(keys);
            sessionStorage.setItem(dpeepUserKeys, JSON.stringify(keys));

            return { success: true, msg: 'Is authenticating', keyPair: keys };
        },
        [gun]
    );

    const loginPassword = React.useCallback(
        async (username, password) => {

            const passwordString = username + password;
            const keyHash = await sha256(passwordString);
            const encryptedstring = localStorage.getItem(keyHash);

            if (!encryptedstring)
                return { success: false, msg: 'Unknown user or missing key pair. Try signup.' };

            const keyPair = await sea.decrypt(encryptedstring, passwordString);
            if (!keyPair)
                return { success: false, msg: 'Decryption of key pair failed' };

            return await login(keyPair);
        },
        [login]
    );

    const signup = React.useCallback(
        async (username, password) => {

            // Check first if the user already exist, and then auto login 
            const ack = await loginPassword(username, password);
            if (ack.sucess) // Login success, now return keypair 
                return ack;

            // There is no user, therefore create a new keyPair
            const passwordString = username + password;
            const keyHash = await sha256(passwordString);
            const keyPair = await sea.pair();
            const encryptedString = await sea.encrypt(JSON.stringify(keyPair), passwordString);
            localStorage.setItem(keyHash, encryptedString);

            return login(keyPair);
        },
        [login, loginPassword]
    );

    const logout = React.useCallback(() => {
        gunUser.leave();

        sessionStorage.setItem(dpeepUserKeys, '');
        setGunUser(null);
        setIsLoggedIn(false);
        setUser(null);
        setFeed([]);
        setFeedIndex({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gunUser]);

    gun.on('auth', async () => {
        setIsLoggedIn(true);
        const user = gun.user();
        setGunUser(user);

        const dpeepUser = getUserContainer(user); // Load currently loggin user
        // Load the profile on to dpeepUser
        await loadProfile(dpeepUser);
        setUser(dpeepUser);
        initializeFeed(dpeepUser);
    });


    const getUserContainer = React.useCallback(
        (gunUser) => {

            const pubId = (gunUser.is) ? gunUser.is.pub : gunUser["_"]["soul"].substring(1);
            const dpeep = gunUser.get(resources.node.names.dpeep);
            const profile = dpeep.get(resources.node.names.profile);
            const tweets = dpeep.get(resources.node.names.tweets);
            const follow = dpeep.get(resources.node.names.follow);
            const people = dpeep.get(resources.node.names.people);

            //const tree = new DateTree(tweets, 'millisecond'); // Do not work properly, events do not get fired and data not stored.
            //const tree = tweets;

            const node = { user: gunUser, tweets, profile, follow, people, dpeep };
            const container = { id: pubId, node };
            users[pubId] = Object.assign(users[pubId] || {}, container);

            return users[pubId];
        },
        [users]
    );

    const getUserContainerById = React.useCallback(
        (pubId) => {
            const container = users[pubId]; // Just return an exiting container is exist
            if (container) return container;

            const user = gun.user(pubId);

            return getUserContainer(user); // Create a new one
        },
        [gun, users, getUserContainer]
    );

    const userSignUp = React.useCallback(
        async (signedUpData) => {
            if (isLoggedIn)
                return;

            signup(signedUpData.handle, signedUpData.password);
            signedUpData.password = null;

            setSignedUp(true);
            //setSignedUpData(signedUpData); // Save data for when ready to update the user profile.
        },
        [isLoggedIn, signup, setSignedUp]
    );

    const followUser = React.useCallback(async (pubId) => {
        if (!isLoggedIn || user === null) return;

        user.followNode.get(pubId).put(gun.user(pubId));

    }, [isLoggedIn, user, gun]);

    const setProfile = React.useCallback(
        async (profileData) => {
            if (!isLoggedIn) return;

            user.node.profile.put(profileData);
        },
        [isLoggedIn, user]
    );

    const loadProfile = React.useCallback(
        async (user) => {

            if (!user.profile) {
                const preProfile = {
                    handle: `${user.id.substring(0, 4)}...${user.id.substring(user.id.length - 4, user.id.length)}`,
                    username: 'Anonymous'
                };

                const loadedProfile = await user.node.profile.once().then() || {};

                user.profile = Object.assign({}, resources.node.profile, preProfile, loadedProfile);
            }
            return user.profile;
        },
        []
    );


    // Methods ----------------------------------------------------------------------
    const addFeed = React.useCallback((data, sourceUser) => {

        const item = createTweetContainer(data, sourceUser);

        feedIndex.set(item.soul, item); // Use index, so the data only gets added to the feed once.
        feedReady.set(item.soul, item);
        setMessageReceived(item.soul);
        return true;

    }, [feedReady, feedIndex]); // User here is the viewer

    const addLatestTweet = React.useCallback(async (user) => {
        const latest = await user.node.tweets.get(resources.node.names.latest).once().then();
        if (latest) {
            addFeed(latest, user);
        }
    }, [addFeed]);

    const subscribeTweets = React.useCallback((user) => {
        user.node.tweets.get(resources.node.names.latest).on((tweet, key) => {
            addFeed(tweet, user);
        });
    }, [addFeed]);


    // Build up users collection, needs refactoring, as it gets called multiple times.
    const initializeFeed = async (userContainer) => {
        console.log("Subscribing to users feed");
        await addLatestTweet(userContainer);
        subscribeTweets(userContainer);

        const followData = await userContainer.node.follow.once().then() || {};

        const addLatestTweets = Object.keys(followData).filter(key => key !== '_' && key !== userContainer.id && followData[key]).map(key => {

            const followUser = getUserContainerById(key);

            subscribeTweets(followUser);
            return addLatestTweet(followUser);
        });

        await Promise.all(addLatestTweets);
        //setFeedUpdated('all');
    };

    // UseEffects --------------------------------------------------------------------------------------------

    // Signup effect, register at the userIndex that we exist.
    useEffect(() => {
        if (!signedUp || !isLoggedIn || !user) return;

        gun.get(resources.node.names.dpeep).get(resources.node.names.userIndex).get(user.id).put(user.node.user);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signedUp, isLoggedIn]);


    // One time only effect 
    useEffect(() => {
        if (isLoggedIn) {
          console.log(`User loggedIn`);
          return;
        }
    
        // Auto signin the user if keys exist in sessionStorage
        const keysString = sessionStorage.getItem(dpeepUserKeys);
        if(keysString && keysString.length > 2) {
          const keys = JSON.parse(keysString);
          if(keys)
            login(keys);
        }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

    const value = React.useMemo(
        () => ({
            user, users, gun, isLoggedIn, feed, feedIndex, feedReady, messageReceived, userSignUp, loginPassword, logout, setFeed, setFeedReady, setProfile, getUserContainerById, loadProfile, followUser, setMessageReceived
        }),
        [
            user, users, gun, isLoggedIn, feed, feedIndex, feedReady, messageReceived, userSignUp, loginPassword, logout, setFeed, setFeedReady, setProfile, getUserContainerById, loadProfile, followUser, setMessageReceived
        ]
    );

    return <UserContext.Provider value={value} {...props} />;
};

export { UserProvider, UserContext };
