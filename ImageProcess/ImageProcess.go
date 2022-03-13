package ImageProcess

import(
	"fmt"
	"math"
	"os"
	"os/exec"
	"github.com/disintegration/imaging"
	"github.com/nfnt/resize"
)

func Trim_rectangle(srcPath string, outPath string) error{
	// check if file exists
	if !fileExists(srcPath) {
		return fmt.Errorf("%v path does not exist or not a file", srcPath)
	}

	/*-----------*/

	// open a source image
	src, err := imaging.Open(srcPath)

	if err != nil {
		return nil
	}

	/*-----------*/

	// find minimum dimension (width or height)
	bounds := src.Bounds()
	size := bounds.Max.X // width

	if bounds.Max.Y < size {
		size = bounds.Max.Y // height
	}

	/*-----------*/

	// modify image
	out := imaging.CropAnchor(src, int(math.Round(float64(size)*1.91)), size, imaging.Left) // resize
	resizedImg := resize.Resize(0, 418, out, resize.NearestNeighbor)

	/*-----------*/

	// save image
	if err := imaging.Save(resizedImg, outPath); err != nil {
		return err
	}
	cmd := "python3 other/cutting.py " + outPath + " " + outPath
	exec.Command("sh", "-c", cmd).Output()

	/*-----------*/

	// return `nil` error
	return nil
}

// check if file exists
func fileExists(path string) bool {
	fileInfo, err := os.Stat(path)

	if err != nil {
		return false // return `false` on error
	}

	return !fileInfo.IsDir() // return `true` if file is not a directory
}