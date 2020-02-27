const puppeteer = require('puppeteer');
const Promise = require('promise');
const fs = require('fs');
const axios = require('axios');



// const GET_API = 'https://vietnamnet.vn/rss/kinh-doanh.rss';
// const POST_API = 'http://happyhome.guru//wp-json/wp/v2/posts';
// const USER_NAME = 'admin';
// const PASSWORD = 'anhndC00120';

const GET_API = 'https://vietnamnet.vn/rss/bat-dong-san/noi-that.rss';
const POST_API = 'http://kientrucrl.com/wp-json/wp/v2/posts';
const USER_NAME = 'manager';
const PASSWORD = 'X&fEOXF6JMD$V0boLFveuKxi';

async function getTitle(link, page, key) {
    await page.goto(link, {
        timeout: 3000000
    });
    await page.waitFor(2000);

    let title = await page.evaluate(() => {
        const listItem = document.querySelectorAll("#ArticleContent > *");
        let contentItemText = '';
        const resultsDataPage = [...listItem].map((item) => {
            let contentItem = item.querySelector("div.inner-article");

            if (contentItem) {
                return item.innerHTML;
            }

            contentItem = item.querySelector("div.bold.ArticleLead > h2 > p");
            if (contentItem) {
                contentItemText = contentItem.innerText
                return contentItemText;
            } else {
                if (item.querySelector("tbody")) {
                    const contentItemImg = item.querySelector('img');
                    const contentItemImgDesc = item.querySelector('.image_desc');

                    return {
                        image: contentItemImg.src,
                        imageDesc: contentItemImgDesc && contentItemImgDesc.innerText,
                    };
                }
                contentItem = item.querySelector("center > a");
                if (contentItem) {
                    return { image: contentItem.href };
                } else {
                    let contentItem = item.outerHTML;

                    if (contentItem.slice(0, 5) === '<div ') {
                        return '';
                    }

                    contentItem = item.querySelector("p");
                    if (contentItem) {
                        return contentItem.innerText;
                    } else {
                        return item.innerText; // innerHTML
                    }
                }
            }
        })
        return resultsDataPage;
    });

    // console.log('Page ID Spawned', key, title);
    return title;
}

(async () => {
    const browser = await puppeteer.launch({ devtools: true });
    // const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image') {
            req.abort();
        }
        else {
            req.continue();
        }
    });

    await page.goto(GET_API);

    const results = await page.evaluate(() => {
        let items = document.querySelectorAll('item')
        let links = []
        items.forEach((item) => {
            const title = item.querySelector('title');
            // const description = item.querySelector('description');
            const link = item.querySelector('link');
            // const image = item.querySelector('image');
            const linkArr = link.textContent.split('/');
            const linkPost = linkArr[linkArr.length - 1].split('.')[0];



            links.push({
                title: title.textContent,
                // description: description.textContent,
                fullLink: link.textContent,
                link: linkPost,
                // image: image.textContent,
            })
        })

        return links;
    });
    console.log(results, 'results');
    const contentsFile = fs.readFileSync('postExist', 'utf8');
    const arrContentFile = contentsFile.split('\n');
    console.log(arrContentFile);


    const resultsNotExist = [];

    results.forEach((page) => {
        if (arrContentFile.includes(page.fullLink)) {

        } else {
            resultsNotExist.push(page);
        }

    })

    const promises = [];
    for (let i = 0; i < 1; i++) { // resultsNotExist.length
        promises.push(await getTitle(resultsNotExist[i].fullLink, page, i).catch((err) => console.log(err)))
    }

    const resultData = await Promise.all(promises);
    console.log(resultData);

    const promisesGetImage = [];

    const resultDataRemoveNotUse = resultData.map((page) => {
        return page.map(row => {
            if (typeof row === 'object') {
                if (row.image) {
                    console.log('start get image');
                    const response = axios.get(row.image, {
                        responseType: 'arraybuffer'
                    }).then(value => {
                        const imageBase64 = "data:" + "image/jpg" + ";base64," + Buffer.from(value.data, 'binary').toString('base64');
                        return imageBase64;
                    });
                    promisesGetImage.push(response);
                };
                return row;
            } else {
                if (row.slice(0, 5) === '<div ') {
                    return '';
                }
                return row;
            }
        })
    })

    const listImage = await Promise.all(promisesGetImage);
    let indexImage = 0;
    const dataContent = [];

    const contentsFile2 = fs.readFileSync('listSpin', 'utf8').split("\r").join("");
    const arrContentFile2 = contentsFile2.split('\n');
    
    resultDataRemoveNotUse.forEach((page, index) => {
        dataContent[index] = '';
        page.forEach((row, indexPage) => {
            if (typeof row === 'object') {
                if (row.image) {
                    indexImage += 1;
                    if(row.imageDesc) {
                        // dataContent[index] += `\n <img src='${listImage[indexImage - 1]}' /><p>${row.imageDesc}</p>`;
                    
                    } else {
                    // dataContent[index] += `\n <img src='${listImage[indexImage - 1]}' />\n`;
                    }
                   
                };
            } else {
                if (row) {
                    arrContentFile2.forEach((listSynonym)=>{
                        console.log(row, '===========================')
                        listSynonym.split('|').forEach((synonym)=>{
                            if(row.includes(" "+synonym+ " ")) {
                                console.log(synonym, 'synonymsynonymsynonymsynonymsynonymsynonymsynonymsynonym');
                                row = row.replace(new RegExp(synonym, "gi"), `{${listSynonym}}`)
                            }
                        })
                    })
                    if (indexPage === 0) {
                        dataContent[index] += `\n <strong>${row}</strong> \n`;
                    }
                    else {
                        dataContent[index] += `\n${row}\n`;
                    }
                    console.log(row);
                }
            }
        })
    })

    // post to WP


    
    // console.log(resultsNotExist);
    dataContent.forEach((content, index) => {
        console.log('start POST API');

        const dataPost = {
            title: resultsNotExist[index].title,
            content: content,
        }
        
        console.log('start POST API', resultsNotExist[index].title, content);

        // axios.post(POST_API, dataPost, {
        //     auth: {
        //         username: USER_NAME,
        //         password: PASSWORD,
        //     }
        // }).then((response) => {
        //     console.log(response && response.headers && response.headers.location);
        //     fs.appendFileSync('postExist', resultsNotExist[index].fullLink + '\n');
        // })
        //     .catch(err => { console.log(err.response) });

    })
    await browser.close();
})();