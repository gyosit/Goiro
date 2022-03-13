from PIL import Image
import sys

def expand2square(pil_img, targ_width, targ_height, background_color):
    width, height = pil_img.size
    result = Image.new(pil_img.mode, (targ_width, targ_height), background_color)
    result.paste(pil_img, ((targ_width - width) // 2, (targ_height - height) // 2))
    return result

if __name__ == "__main__":
    in_path = sys.argv[1]
    out_path = sys.argv[2]
    im = Image.open(in_path)
    out = expand2square(im, 800, 418, (255, 255, 255))
    out.save(out_path, quality=95)