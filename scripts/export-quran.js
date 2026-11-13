/**
 * Quran Data Export Script
 * Downloads Tanzil Uthmani text and Sahih International translation from api.alquran.cloud
 * Splits the Quran into 114 separate JSON files (data/quran/{number}.json)
 * and generates metadata in data/surahs.json
 */
const fs = require('fs');
const path = require('path');

async function exportQuran() {
  const outputDir = path.join(__dirname, '..', 'data', 'quran');
  const metaPath = path.join(__dirname, '..', 'data', 'surahs.json');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Downloading Uthmani Quran text...');
  const uthmaniRes = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
  const uthmaniData = await uthmaniRes.json();

  console.log('Downloading English translation (Sahih International)...');
  const englishRes = await fetch('https://api.alquran.cloud/v1/quran/en.sahih');
  const englishData = await englishRes.json();

  const uthmaniSurahs = uthmaniData.data.surahs;
  const englishSurahs = englishData.data.surahs;

  const surahsMeta = [];

  for (let i = 0; i < 114; i++) {
    const uSurah = uthmaniSurahs[i];
    const eSurah = englishSurahs[i];

    surahsMeta.push({
      number: uSurah.number,
      name: uSurah.name,
      englishName: uSurah.englishName,
      englishNameTranslation: uSurah.englishNameTranslation,
      numberOfAyahs: uSurah.ayahs.length,
      revelationType: uSurah.revelationType
    });

    const surahDetail = {
      number: uSurah.number,
      name: uSurah.name,
      englishName: uSurah.englishName,
      englishNameTranslation: uSurah.englishNameTranslation,
      numberOfAyahs: uSurah.ayahs.length,
      revelationType: uSurah.revelationType,
      ayahs: uSurah.ayahs.map((ayah, idx) => ({
        number: ayah.number,
        numberInSurah: ayah.numberInSurah,
        juz: ayah.juz,
        text: ayah.text,
        translation: eSurah.ayahs[idx] ? eSurah.ayahs[idx].text : ''
      }))
    };

    fs.writeFileSync(
      path.join(outputDir, `${uSurah.number}.json`),
      JSON.stringify(surahDetail, null, 2),
      'utf8'
    );
  }

  fs.writeFileSync(metaPath, JSON.stringify(surahsMeta, null, 2), 'utf8');
  console.log(`Successfully exported 114 surahs and metadata to ${metaPath}`);
}

exportQuran().catch(err => {
  console.error('Error during export:', err);
  process.exit(1);
});
