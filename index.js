const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const app = express();

const maxApiWaitTime = 3000; // 3 seconds
const maxTime = 10000; // 10 seconds
const apis = [
    "https://youtube.076.ne.jp/",
    "https://vid.puffyan.us/",
    "https://inv.riverside.rocks/",
    "https://invidio.xamh.de/",
    "https://y.com.sb/",
    "https://invidious.sethforprivacy.com/",
    "https://invidious.tiekoetter.com/",
    "https://inv.bp.projectsegfau.lt/",
    "https://inv.vern.cc/",
    "https://invidious.nerdvpn.de/",
    "https://inv.privacy.com.de/",
    "https://invidious.rhyshl.live/",
    "https://invidious.slipfox.xyz/",
    "https://invidious.weblibre.org/",
    "https://invidious.namazso.eu/"
];

app.use(express.static(path.join(__dirname, 'css')));
app.use(express.static(path.join(__dirname, 'blog')));
app.use(express.static(path.join(__dirname, 'game')));
app.use(cookieParser());

function isJson(jsonStr) {
    try {
        JSON.parse(jsonStr);
        return true;
    } catch (error) {
        return false;
    }
}

async function apiRequest(url) {
    const startTime = Date.now();
    for (let api of apis) {
        if (Date.now() - startTime >= maxTime - 1000) {
            break;
        }
        try {
            const res = await axios.get(api + url, { timeout: maxApiWaitTime });
            if (res.status === 200 && isJson(res.data)) {
                return res.data;
            } else {
                console.log(`Error: ${api}`);
            }
        } catch (error) {
            console.log(`Timeout: ${api}`);
        }
    }
    throw new Error("API timeout");
}

async function getData(videoId) {
    const t = await apiRequest(`api/v1/videos/${encodeURIComponent(videoId)}`);
    return [
        t.recommendedVideos.map(i => ({
            id: i.videoId,
            title: i.title,
            authorId: i.authorId,
            author: i.author
        })),
        t.formatStreams.map(i => i.url).reverse().slice(0, 2),
        t.descriptionHtml.replace(/\n/g, "<br>"),
        t.title,
        t.authorId,
        t.author,
        t.authorThumbnails[t.authorThumbnails.length - 1].url
    ];
}

app.get("/", async (req, res) => {
    if (req.cookies.yuki) {
        res.cookie('yuki', 'True', { maxAge: 60 * 60 * 24 * 7 });
        res.sendFile(path.join(__dirname, 'templates', 'home.html'));
    } else {
        res.redirect('/word');
    }
});

app.get("/watch", async (req, res) => {
    if (!req.cookies.yuki) {
        return res.redirect("/");
    }
    const videoId = req.query.v;
    const t = await getData(videoId);
    res.sendFile(path.join(__dirname, 'templates', 'video.html'), { 
        videoid: videoId,
        videourls: t[1],
        res: t[0],
        description: t[2],
        videotitle: t[3],
        authorid: t[4],
        authoricon: t[6],
        author: t[5]
    });
});

app.get("/search", async (req, res) => {
    const q = req.query.q;
    const page = req.query.page || 1;
    if (!req.cookies.yuki) {
        return res.redirect("/");
    }
    const results = await getSearch(q, page);
    res.sendFile(path.join(__dirname, 'templates', 'search.html'), { results, word: q });
});

app.get("/channel/:channelId", async (req, res) => {
    const channelId = req.params.channelId;
    if (!req.cookies.yuki) {
        return res.redirect("/");
    }
    const t = await getChannel(channelId);
    res.sendFile(path.join(__dirname, 'templates', 'channel.html'), { 
        results: t[0],
        channelname: t[1].channelname,
        channelicon: t[1].channelicon,
        channelprofile: t[1].channelprofile 
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
