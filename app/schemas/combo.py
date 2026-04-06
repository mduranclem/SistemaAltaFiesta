from pydantic import BaseModel, Field


class ComboItemCreate(BaseModel):
    ingredient_product_id: int
    quantity: float = Field(gt=0)


class ComboItemResponse(BaseModel):
    id: int
    combo_product_id: int
    ingredient_product_id: int
    quantity: float
    ingredient_name: str = ""

    model_config = {"from_attributes": True}
