// Contour de la clé « PSX Tower Key – Rusty Radio Tower Key », ZwiebelGames, CC BY 4.0
// (https://sketchfab.com/3d-models/psx-tower-key-rusty-radio-tower-key-a2ba7ef56ec04eaebf3acda251101442).
// Extrait du GLB fourni : le modèle est un contour extrudé ; on garde ses arêtes latérales à y = 0.
// Coordonnées du modèle [x, z] : z le long de la lame (pointe en +z), x en travers (denture en +x).
// FIXED suit le contour du sommet 10 (fin de la denture, côté pointe) au sommet 41 (épaulement) :
// pointe, dos de la lame, épaulement et anneau. La denture entre 41 et 10 est retaillée par famille.
export const FIXED = [[0.2217, 1.6128], [0.0398, 1.7842], [-0.0473, 1.7789], [-0.2688, 1.5442], [-0.2583, 0.7055], [-0.2715, 0.3046], [-0.3401, 0.2914], [-0.348, 0.2202], [-0.2926, 0.2096], [-0.2952, 0.0857], [-0.3453, 0.0118], [-0.4851, -0.0752], [-0.6196, -0.1807], [-0.7251, -0.3601], [-0.7726, -0.492], [-0.7779, -0.7293], [-0.7304, -0.9087], [-0.6249, -1.0537], [-0.435, -1.2173], [-0.2847, -1.2647], [-0.0363, -1.2846], [0.1695, -1.2761], [0.2941, -1.234], [0.4278, -1.1442], [0.5542, -1.027], [0.6494, -0.8805], [0.6915, -0.7724], [0.6842, -0.4061], [0.6201, -0.2669], [0.4956, -0.1368], [0.3692, -0.0306], [0.2556, 0.0628]];
export const HOLE = [[-0.1213, -1.1533], [-0.1886, -1.1083], [-0.2336, -1.0409], [-0.2494, -0.9615], [-0.2336, -0.8821], [-0.1886, -0.8148], [-0.1213, -0.7698], [-0.0419, -0.754], [0.0375, -0.7698], [0.1048, -0.8148], [0.1498, -0.8821], [0.1656, -0.9615], [0.1627, -0.976], [0.1498, -1.0409], [0.1048, -1.1083], [0.0375, -1.1533], [-0.0419, -1.169]];
export const BITTING = { from: [[0.2556, 0.0628]][0], to: [[0.2217, 1.6128]][0], top: 0.29, back: -0.265 };
export const THICKNESS = 0.0748;
