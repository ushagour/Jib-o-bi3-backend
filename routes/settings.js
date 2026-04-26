const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { MobileSetting } = require('../models');

router.use(auth);

const defaultMobileSettings = [
  {
    key: 'home_hero_title',
    title: 'Home Hero Title',
    subtitle: 'Main heading shown on home screen',
    value: 'Welcome to JIB O BI3',
    value_type: 'text',
    image_url: '',
    feature_enabled: true,
    group_name: 'home',
    sort_order: 1,
  },
  {
    key: 'home_hero_image',
    title: 'Home Hero Image',
    subtitle: 'Top banner image URL',
    value: '',
    value_type: 'image',
    image_url: '',
    feature_enabled: true,
    group_name: 'home',
    sort_order: 2,
  },
  {
    key: 'enable_in_app_chat',
    title: 'Enable In-App Chat',
    subtitle: 'Feature toggle for app chat',
    value: 'true',
    value_type: 'boolean',
    image_url: '',
    feature_enabled: true,
    group_name: 'features',
    sort_order: 10,
  },
  {
    key: 'promo_banner_title',
    title: 'Promo Banner Title',
    subtitle: 'Title for marketing banner',
    value: 'Best deals this week',
    value_type: 'text',
    image_url: '',
    feature_enabled: true,
    group_name: 'marketing',
    sort_order: 20,
  },
];

router.get('/mobile', async (req, res) => {
  try {
    const existingCount = await MobileSetting.count();

    if (!existingCount) {
      await MobileSetting.bulkCreate(defaultMobileSettings);
    }

    const settings = await MobileSetting.findAll({
      order: [['group_name', 'ASC'], ['sort_order', 'ASC'], ['id', 'ASC']],
    });

    res.status(200).send(settings);
  } catch (error) {
    console.error('Error fetching mobile settings:', error);
    res.status(500).send({ error: 'Failed to fetch mobile settings.' });
  }
});

router.post('/mobile', async (req, res) => {
  try {
    const payload = {
      key: req.body.key,
      title: req.body.title,
      subtitle: req.body.subtitle || '',
      value: req.body.value || '',
      value_type: req.body.value_type || 'text',
      image_url: req.body.image_url || '',
      feature_enabled: Boolean(req.body.feature_enabled),
      group_name: req.body.group_name || 'general',
      sort_order: Number(req.body.sort_order || 0),
      updated_by: req.user?.userId || null,
    };

    if (!payload.key || !payload.title) {
      return res.status(400).send({ error: 'key and title are required.' });
    }

    const setting = await MobileSetting.create(payload);
    res.status(201).send(setting);
  } catch (error) {
    console.error('Error creating mobile setting:', error);
    res.status(500).send({ error: 'Failed to create mobile setting.' });
  }
});

router.put('/mobile/:id', async (req, res) => {
  try {
    const setting = await MobileSetting.findByPk(req.params.id);

    if (!setting) {
      return res.status(404).send({ error: 'Mobile setting not found.' });
    }

    const payload = {
      key: req.body.key ?? setting.key,
      title: req.body.title ?? setting.title,
      subtitle: req.body.subtitle ?? setting.subtitle,
      value: req.body.value ?? setting.value,
      value_type: req.body.value_type ?? setting.value_type,
      image_url: req.body.image_url ?? setting.image_url,
      feature_enabled:
        req.body.feature_enabled === undefined
          ? setting.feature_enabled
          : Boolean(req.body.feature_enabled),
      group_name: req.body.group_name ?? setting.group_name,
      sort_order:
        req.body.sort_order === undefined
          ? setting.sort_order
          : Number(req.body.sort_order),
      updated_by: req.user?.userId || null,
    };

    await setting.update(payload);
    res.status(200).send(setting);
  } catch (error) {
    console.error('Error updating mobile setting:', error);
    res.status(500).send({ error: 'Failed to update mobile setting.' });
  }
});

router.delete('/mobile/:id', async (req, res) => {
  try {
    const setting = await MobileSetting.findByPk(req.params.id);

    if (!setting) {
      return res.status(404).send({ error: 'Mobile setting not found.' });
    }

    await setting.destroy();
    res.status(200).send({ message: 'Mobile setting deleted successfully.' });
  } catch (error) {
    console.error('Error deleting mobile setting:', error);
    res.status(500).send({ error: 'Failed to delete mobile setting.' });
  }
});

module.exports = router;