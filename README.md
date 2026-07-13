# Verseny - kiabalos akadálypálya

Külön projekt a meglévő Star Wars/Auchan app mellett. A régi projektet nem módosítja.

## Indítás

```bash
npm install
npm run dev
```

Admin:

```text
http://localhost:5175/admin
```

Public kijelzők:

```text
http://localhost:5175/public
http://localhost:5175/wall/a
http://localhost:5175/wall/b
```

## Kijelzőlogika

- `/wall/a`: A versenyző külön 320×1080 fala.
- `/wall/b`: B versenyző külön 320×1080 fala.
- `/public`: kombinált 640×1080 nézet, bal oldalon A, jobb oldalon B.

## Játékflow

1. Admin elindítja A versenyző kiabálásmérését.
2. A mért csúcspont rögzül A autójának sebességeként.
3. Admin elindítja B versenyző kiabálásmérését.
4. A mért csúcspont rögzül B autójának sebességeként.
5. Admin elindítja a futamot.
6. Az autók a saját sebességükkel haladnak az akadálypályán.
7. Ütközéskor az adott autó rövid időre lelassul.
8. A célba elsőként érő autó győztesként kiemelve jelenik meg.

## Teszt irányítás

- A autó: `A` és `D`
- B autó: bal és jobb nyíl

Később ezek a bemenetek kiválthatók joystick/USB kontroller kezeléssel, a játéklogika már külön A/B irányértéket használ.
