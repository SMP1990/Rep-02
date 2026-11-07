How the Trending Sounds user guide was made (for a developer / AI session; the owner does not need this)

Edit the text in ../src/part1.html, part2a.html, part2b.html, part3.html and the style in ../src/style.css.
1. prep-guide-data.cjs builds a demo data folder from real collected sounds (needs a data3 folder with soundsData.json and MP3s).
2. Run the site on port 3990 with DATA_DIR pointing at that folder (npm run build first), admin test@example.com.
3. shots-admin.cjs and shots-front.cjs take the screenshots with Edge headless (cdp.cjs) and draw the red numbers (annotate.cjs).
4. build-guide.cjs joins the parts into ../Sounds-User-Guide.html and prints ../Sounds-User-Guide.pdf (A4).
5. pdf-pages.cjs + sheet.cjs make picture sheets of the PDF pages for checking the layout.
The scripts contain paths of the machine they were written on: adjust them before running.
