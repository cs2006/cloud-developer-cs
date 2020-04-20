import { Router, Request, Response } from 'express';
import { FeedItem } from '../models/FeedItem';
import { requireAuth } from '../../users/routes/auth.router';
import * as AWS from '../../../../aws';

const router: Router = Router();

// Get all feed items
router.get('/', async (req: Request, res: Response) => {
    const items = await FeedItem.findAndCountAll({order: [['id', 'DESC']]});
    items.rows.map((item) => {
            if(item.url) {
                item.url = AWS.getGetSignedUrl(item.url);
            }
    });
    res.send(items);
});

//@TODO
//Add an endpoint to GET a specific resource by Primary Key
router.get('/:in_id', async (req: Request, res: Response) => {
    let {in_id} = req.params;
    const feed_result = await FeedItem.findByPk(in_id);
    if (!feed_result) {
        return res.status(400).send(`id is not available, ${in_id}`);
    }
    return res.status(200).send(feed_result);
});

// update a specific resource
router.patch('/:in_id', 
    requireAuth, 
    async (req: Request, res: Response) => {
        //@TODO try it yourself
        let {in_id} = req.params;
        const in_caption = req.body.caption;
        const in_url = req.body.url;

        const feed_result = await FeedItem.update({caption: in_caption, url:in_url}, {
            where: {
                id: in_id
            }
        });
        if (feed_result.length > 0) { 
            return res.send(500).send(`not implemented`)
        };
        const new_feed = await FeedItem.findByPk(in_id);
        res.status(201).send(new_feed);
});


// Get a signed url to put a new item in the bucket
router.get('/signed-url/:fileName', 
    requireAuth, 
    async (req: Request, res: Response) => {
    let { fileName } = req.params;
    const url = AWS.getPutSignedUrl(fileName);
    res.status(201).send({url: url});
});

// Post meta data and the filename after a file is uploaded 
// NOTE the file name is they key name in the s3 bucket.
// body : {caption: string, fileName: string};
router.post('/', 
    requireAuth, 
    async (req: Request, res: Response) => {
    const caption = req.body.caption;
    const fileName = req.body.url;

    // check Caption is valid
    if (!caption) {
        return res.status(400).send({ message: 'Caption is required or malformed' });
    }

    // check Filename is valid
    if (!fileName) {
        return res.status(400).send({ message: 'File url is required' });
    }

    const item = await new FeedItem({
            caption: caption,
            url: fileName
    });

    const saved_item = await item.save();

    saved_item.url = AWS.getGetSignedUrl(saved_item.url);
    res.status(201).send(saved_item);
});

export const FeedRouter: Router = router;